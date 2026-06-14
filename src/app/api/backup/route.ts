import { NextRequest, NextResponse } from 'next/server'
import { sqlite, dbPath } from '@/db'
import { existsSync } from 'fs'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import AdmZip from 'adm-zip'

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

// テーブルの依存順（FK無効中なので順不同でもよいが念のため）
const TABLES = [
  'persons', 'video_styles', 'projects', 'story_scenes', 'media',
  'character_bibles', 'scene_bibles', 'transition_bibles',
  'generated_prompts', 'narration_scripts', 'generated_videos',
]

// ─── GET: バックアップ ZIP をダウンロード ────────────────────────
export async function GET() {
  try {
    // WAL を main DB ファイルにフラッシュして一貫したスナップショットを取る
    sqlite.pragma('wal_checkpoint(TRUNCATE)')

    const zip = new AdmZip()
    zip.addLocalFile(dbPath, '', 'seitatchi.db')

    if (existsSync(UPLOADS_DIR)) {
      zip.addLocalFolder(UPLOADS_DIR, 'uploads')
    }

    const buffer = zip.toBuffer()
    const date = new Date().toISOString().slice(0, 10)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="seitatchi-backup-${date}.zip"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (e) {
    console.error('Backup error:', e)
    return NextResponse.json({ error: 'バックアップの作成に失敗しました' }, { status: 500 })
  }
}

// ─── POST: バックアップ ZIP から復元 ─────────────────────────────
export async function POST(req: NextRequest) {
  let tempPath: string | null = null

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file || !file.name.endsWith('.zip')) {
      return NextResponse.json({ error: '.zip ファイルを選択してください' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const zip = new AdmZip(buffer)

    // ── メディアファイルの復元 ──────────────────────────────────
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue
      if (!entry.entryName.startsWith('uploads/')) continue

      // パストラバーサル対策
      const destPath = path.resolve(process.cwd(), 'public', entry.entryName)
      if (!destPath.startsWith(path.resolve(process.cwd(), 'public', 'uploads'))) continue

      await mkdir(path.dirname(destPath), { recursive: true })
      await writeFile(destPath, entry.getData())
    }

    // ── DB の復元（ATTACH 経由でオンライン復元）─────────────────
    const dbEntry = zip.getEntry('seitatchi.db')
    if (dbEntry) {
      tempPath = path.join(process.cwd(), '_restore_temp.db')
      await writeFile(tempPath, dbEntry.getData())

      // Windows パスを SQLite 用にスラッシュ化
      const sqlitePath = tempPath.replace(/\\/g, '/')

      sqlite.pragma('foreign_keys = OFF')
      sqlite.exec(`ATTACH '${sqlitePath}' AS restore_src`)

      const doRestore = sqlite.transaction(() => {
        for (const table of TABLES) {
          try {
            sqlite.exec(`DELETE FROM "${table}"`)
            sqlite.exec(`INSERT INTO "${table}" SELECT * FROM restore_src."${table}"`)
          } catch {
            // バックアップにないテーブルはスキップ
          }
        }
      })
      doRestore()

      sqlite.exec('DETACH restore_src')
      sqlite.pragma('foreign_keys = ON')

      await unlink(tempPath)
      tempPath = null
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    if (tempPath) {
      try { await unlink(tempPath) } catch { /* ignore */ }
    }
    console.error('Restore error:', e)
    return NextResponse.json({ error: '復元に失敗しました', detail: String(e) }, { status: 500 })
  }
}
