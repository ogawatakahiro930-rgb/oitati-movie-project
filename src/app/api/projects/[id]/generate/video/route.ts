import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { generatedPrompts, generatedVideos, storyScenes } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { createVideoTask } from '@/lib/kling'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const { sceneId } = await req.json()

  if (!sceneId) {
    return NextResponse.json({ error: 'sceneIdが必要です' }, { status: 400 })
  }

  // そのシーンの動画プロンプトを取得
  const [promptRow] = await db
    .select()
    .from(generatedPrompts)
    .where(
      and(
        eq(generatedPrompts.projectId, projectId),
        eq(generatedPrompts.sceneId, sceneId),
        eq(generatedPrompts.promptType, 'video_generation')
      )
    )

  if (!promptRow) {
    return NextResponse.json({ error: 'プロンプトが生成されていません。先にAI生成を実行してください。' }, { status: 400 })
  }

  // 既に処理中・完了のタスクがあればスキップ
  const existing = await db
    .select()
    .from(generatedVideos)
    .where(and(eq(generatedVideos.projectId, projectId), eq(generatedVideos.sceneId, sceneId)))

  const activeTask = existing.find(v => v.status === 'processing' || v.status === 'completed')
  if (activeTask) {
    return NextResponse.json({ videoId: activeTask.id, status: activeTask.status, alreadyExists: true })
  }

  try {
    const taskId = await createVideoTask({
      prompt: promptRow.promptContent,
      negativePrompt: promptRow.negativePrompt ?? undefined,
      duration: 10,
      aspectRatio: '16:9',
      mode: 'standard',
    })

    const [video] = await db
      .insert(generatedVideos)
      .values({
        projectId,
        sceneId,
        klingTaskId: taskId,
        klingPrompt: promptRow.promptContent,
        status: 'processing',
        durationSec: 10,
        aspectRatio: '16:9',
      })
      .returning()

    return NextResponse.json({ videoId: video.id, taskId, status: 'processing' }, { status: 201 })
  } catch (error) {
    console.error('Kling動画生成エラー:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
