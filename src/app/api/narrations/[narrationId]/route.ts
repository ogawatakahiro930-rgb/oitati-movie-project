import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { narrationScripts } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ narrationId: string }> }
) {
  const { narrationId } = await params
  const { textContent } = await req.json()
  if (typeof textContent !== 'string') {
    return NextResponse.json({ error: 'textContentが必要です' }, { status: 400 })
  }
  const [updated] = await db
    .update(narrationScripts)
    .set({ textContent })
    .where(eq(narrationScripts.id, narrationId))
    .returning()
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}
