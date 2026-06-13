import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { generatedVideos } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const videos = await db
    .select()
    .from(generatedVideos)
    .where(eq(generatedVideos.projectId, id))

  return NextResponse.json(videos)
}
