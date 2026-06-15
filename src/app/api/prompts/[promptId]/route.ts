import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { generatedPrompts } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ promptId: string }> }
) {
  const { promptId } = await params
  const { promptContent, negativePrompt } = await req.json()
  const [updated] = await db
    .update(generatedPrompts)
    .set({
      ...(typeof promptContent === 'string' ? { promptContent } : {}),
      ...(typeof negativePrompt === 'string' ? { negativePrompt } : {}),
    })
    .where(eq(generatedPrompts.id, promptId))
    .returning()
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}
