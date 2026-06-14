import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { storyScenes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  ageAtScene: z.number().optional().nullable(),
  yearAtScene: z.number().optional().nullable(),
  location: z.string().optional().nullable(),
  eventSummary: z.string().min(1).optional(),
  emotionKeywords: z.array(z.string()).optional(),
  directionIntent: z.string().optional().nullable(),
  emotionalStage: z.string().optional().nullable(),
  innerMonologue: z.string().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  const { sceneId } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { emotionKeywords, ...rest } = parsed.data

  const [updated] = await db
    .update(storyScenes)
    .set({
      ...rest,
      ...(emotionKeywords !== undefined
        ? { emotionKeywords: JSON.stringify(emotionKeywords) }
        : {}),
    })
    .where(eq(storyScenes.id, sceneId))
    .returning()

  return NextResponse.json({
    ...updated,
    emotionKeywords: updated.emotionKeywords ? JSON.parse(updated.emotionKeywords) : [],
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  const { sceneId } = await params
  await db.delete(storyScenes).where(eq(storyScenes.id, sceneId))
  return NextResponse.json({ success: true })
}
