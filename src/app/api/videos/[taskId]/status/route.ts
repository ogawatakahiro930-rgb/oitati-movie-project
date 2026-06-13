import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { generatedVideos } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getVideoTaskStatus } from '@/lib/kling'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params

  // DBからvideoレコードを取得
  const [video] = await db
    .select()
    .from(generatedVideos)
    .where(eq(generatedVideos.klingTaskId, taskId))

  if (!video) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 完了・失敗済みならDBの値をそのまま返す（Kling APIを叩かない）
  if (video.status === 'completed' || video.status === 'failed') {
    return NextResponse.json({
      status: video.status,
      videoUrl: video.videoUrl,
      error: video.errorMessage,
    })
  }

  // Klingに問い合わせ
  try {
    const result = await getVideoTaskStatus(taskId)

    if (result.status === 'completed' && result.videoUrl) {
      await db
        .update(generatedVideos)
        .set({ status: 'completed', videoUrl: result.videoUrl })
        .where(eq(generatedVideos.klingTaskId, taskId))
    } else if (result.status === 'failed') {
      await db
        .update(generatedVideos)
        .set({ status: 'failed', errorMessage: result.error ?? '不明なエラー' })
        .where(eq(generatedVideos.klingTaskId, taskId))
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
