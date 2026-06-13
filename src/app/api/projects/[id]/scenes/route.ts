import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { storyScenes } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { z } from 'zod'

const sceneSchema = z.object({
  orderIndex: z.number().int().min(1).max(10),
  title: z.string().min(1),
  ageAtScene: z.number().optional(),
  yearAtScene: z.number().optional(),
  location: z.string().optional(),
  eventSummary: z.string().min(1),
  emotionKeywords: z.array(z.string()).optional(),
  directionIntent: z.string().optional(),
  emotionalStage: z.string().optional(),
  emotionalArcNote: z.string().optional(),
  innerMonologue: z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const scenes = await db
    .select()
    .from(storyScenes)
    .where(eq(storyScenes.projectId, id))
    .orderBy(asc(storyScenes.orderIndex))

  return NextResponse.json(scenes)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const parsed = sceneSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const [scene] = await db
    .insert(storyScenes)
    .values({ projectId: id, ...parsed.data })
    .returning()

  return NextResponse.json(scene, { status: 201 })
}
