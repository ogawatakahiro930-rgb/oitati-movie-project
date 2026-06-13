import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { generatedPrompts } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const rows = await db.select().from(generatedPrompts).where(eq(generatedPrompts.projectId, id))
  return NextResponse.json(rows)
}
