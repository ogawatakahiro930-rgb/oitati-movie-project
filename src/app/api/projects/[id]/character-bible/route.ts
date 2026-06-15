import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { characterBibles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const [bible] = await db.select().from(characterBibles).where(eq(characterBibles.projectId, id))
  if (!bible) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...bible,
    ageProgression: JSON.parse(bible.ageProgression),
    lifeStageStates: JSON.parse(bible.lifeStageStates),
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const allowed = ['consistencyAnchor', 'faceCoreFeatures', 'overallAtmosphere'] as const
  const updates: Record<string, string> = {}
  for (const key of allowed) {
    if (typeof body[key] === 'string') updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400 })
  }
  const [updated] = await db
    .update(characterBibles)
    .set(updates)
    .where(eq(characterBibles.projectId, id))
    .returning()
  return NextResponse.json({
    ...updated,
    ageProgression: JSON.parse(updated.ageProgression),
    lifeStageStates: JSON.parse(updated.lifeStageStates),
  })
}
