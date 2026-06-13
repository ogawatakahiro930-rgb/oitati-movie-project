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
  return NextResponse.json(bible)
}
