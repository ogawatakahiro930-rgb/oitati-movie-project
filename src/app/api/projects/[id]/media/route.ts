import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { media } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const rows = await db.select().from(media).where(eq(media.projectId, id)).orderBy(asc(media.createdAt))
  return NextResponse.json(rows)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const sceneId = formData.get('sceneId') as string | null
  const agePeriod = formData.get('agePeriod') as string | null

  if (!file) return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 })

  const mediaType = file.type.startsWith('video/') ? 'video' : 'photo'
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', projectId)
  await mkdir(uploadDir, { recursive: true })

  const filePath = path.join(uploadDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  const fileUrl = `/uploads/${projectId}/${filename}`

  const [inserted] = await db.insert(media).values({
    projectId,
    mediaType,
    agePeriod: agePeriod || null,
    filePath,
    fileUrl,
    sceneId: sceneId || null,
  }).returning()

  return NextResponse.json(inserted, { status: 201 })
}
