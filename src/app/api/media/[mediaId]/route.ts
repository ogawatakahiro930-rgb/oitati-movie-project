import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { media } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { del } from '@vercel/blob'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params

  const [row] = await db.select().from(media).where(eq(media.id, mediaId))
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    if (row.fileUrl) await del(row.fileUrl)
  } catch {
    // Blob が既にない場合は無視
  }

  await db.delete(media).where(eq(media.id, mediaId))
  return NextResponse.json({ success: true })
}
