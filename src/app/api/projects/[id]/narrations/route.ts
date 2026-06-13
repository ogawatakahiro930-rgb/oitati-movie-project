import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { narrationScripts } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const rows = await db.select().from(narrationScripts).where(eq(narrationScripts.projectId, id))
  return NextResponse.json(rows)
}
