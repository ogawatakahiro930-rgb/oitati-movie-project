import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  persons, videoStyles, projects, storyScenes, media,
  characterBibles, sceneBibles, transitionBibles,
  generatedPrompts, narrationScripts, generatedVideos,
} from '@/db/schema'

// ─── GET: バックアップ JSON をダウンロード ────────────────────────
export async function GET() {
  try {
    const [
      allPersons, allVideoStyles, allProjects, allStoryScenes, allMedia,
      allCharacterBibles, allSceneBibles, allTransitionBibles,
      allGeneratedPrompts, allNarrationScripts, allGeneratedVideos,
    ] = await Promise.all([
      db.select().from(persons),
      db.select().from(videoStyles),
      db.select().from(projects),
      db.select().from(storyScenes),
      db.select().from(media),
      db.select().from(characterBibles),
      db.select().from(sceneBibles),
      db.select().from(transitionBibles),
      db.select().from(generatedPrompts),
      db.select().from(narrationScripts),
      db.select().from(generatedVideos),
    ])

    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      persons: allPersons,
      videoStyles: allVideoStyles,
      projects: allProjects,
      storyScenes: allStoryScenes,
      media: allMedia,
      characterBibles: allCharacterBibles,
      sceneBibles: allSceneBibles,
      transitionBibles: allTransitionBibles,
      generatedPrompts: allGeneratedPrompts,
      narrationScripts: allNarrationScripts,
      generatedVideos: allGeneratedVideos,
    }

    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="seitatchi-backup-${date}.json"`,
      },
    })
  } catch (e) {
    console.error('Backup error:', e)
    return NextResponse.json({ error: 'バックアップの作成に失敗しました' }, { status: 500 })
  }
}

// ─── POST: バックアップ JSON から復元 ─────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file || !file.name.endsWith('.json')) {
      return NextResponse.json({ error: '.json ファイルを選択してください' }, { status: 400 })
    }

    const backup = JSON.parse(await file.text())
    if (!backup.version || !Array.isArray(backup.persons)) {
      return NextResponse.json({ error: '無効なバックアップファイルです' }, { status: 400 })
    }

    // FK依存の逆順で削除
    await db.delete(generatedVideos)
    await db.delete(narrationScripts)
    await db.delete(generatedPrompts)
    await db.delete(transitionBibles)
    await db.delete(sceneBibles)
    await db.delete(characterBibles)
    await db.delete(media)
    await db.delete(storyScenes)
    await db.delete(projects)
    await db.delete(videoStyles)
    await db.delete(persons)

    // FK依存の正順で挿入
    if (backup.persons?.length)          await db.insert(persons).values(backup.persons)
    if (backup.videoStyles?.length)      await db.insert(videoStyles).values(backup.videoStyles)
    if (backup.projects?.length)         await db.insert(projects).values(backup.projects)
    if (backup.storyScenes?.length)      await db.insert(storyScenes).values(backup.storyScenes)
    if (backup.media?.length)            await db.insert(media).values(backup.media)
    if (backup.characterBibles?.length)  await db.insert(characterBibles).values(backup.characterBibles)
    if (backup.sceneBibles?.length)      await db.insert(sceneBibles).values(backup.sceneBibles)
    if (backup.transitionBibles?.length) await db.insert(transitionBibles).values(backup.transitionBibles)
    if (backup.generatedPrompts?.length) await db.insert(generatedPrompts).values(backup.generatedPrompts)
    if (backup.narrationScripts?.length) await db.insert(narrationScripts).values(backup.narrationScripts)
    if (backup.generatedVideos?.length)  await db.insert(generatedVideos).values(backup.generatedVideos)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Restore error:', e)
    return NextResponse.json({ error: '復元に失敗しました', detail: String(e) }, { status: 500 })
  }
}
