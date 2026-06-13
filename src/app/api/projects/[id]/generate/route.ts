import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  projects, persons, storyScenes, videoStyles,
  characterBibles, sceneBibles, transitionBibles,
  generatedPrompts, narrationScripts,
} from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { generateCharacterBible } from '@/lib/ai/character-bible'
import { generateSceneBible, generateTransitionBible } from '@/lib/ai/scene-bible'
import { generateScenePrompts, generateNarration } from '@/lib/ai/prompts'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  // プロジェクト・人物・スタイル取得
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const [person] = await db
    .select()
    .from(persons)
    .where(eq(persons.id, project.personId))

  const scenes = await db
    .select()
    .from(storyScenes)
    .where(eq(storyScenes.projectId, projectId))
    .orderBy(asc(storyScenes.orderIndex))

  if (scenes.length === 0) {
    return NextResponse.json({ error: 'シーンが登録されていません' }, { status: 400 })
  }

  let videoStyleTone = '感動的で温かみのある映像スタイル'
  if (project.videoStyleId) {
    const [style] = await db
      .select()
      .from(videoStyles)
      .where(eq(videoStyles.id, project.videoStyleId))
    if (style) videoStyleTone = `${style.displayName}: ${style.description} (${style.visualTone})`
  }

  // ステータス更新
  await db.update(projects).set({ status: 'generating' }).where(eq(projects.id, projectId))

  try {
    // ─── STEP 1: Character Bible生成 ─────────────────────────
    const photoAnalyses = ['アップロード済み写真から抽出した特徴（写真分析機能はVer2で追加）']
    const characterBibleData = await generateCharacterBible(person, photoAnalyses, videoStyleTone)

    await db
      .insert(characterBibles)
      .values({
        projectId,
        faceCoreFeatures: characterBibleData.faceCoreFeatures,
        bodyType: characterBibleData.bodyType,
        distinctiveMarks: characterBibleData.distinctiveMarks,
        overallAtmosphere: characterBibleData.overallAtmosphere,
        personalityVisuals: characterBibleData.personalityVisuals,
        ageProgression: characterBibleData.ageProgression,
        lifeStageStates: characterBibleData.lifeStageStates,
        consistencyAnchor: characterBibleData.consistencyAnchor,
      })
      .onConflictDoUpdate({
        target: characterBibles.projectId,
        set: {
          faceCoreFeatures: characterBibleData.faceCoreFeatures,
          consistencyAnchor: characterBibleData.consistencyAnchor,
          ageProgression: characterBibleData.ageProgression,
          lifeStageStates: characterBibleData.lifeStageStates,
        },
      })

    // ─── STEP 2: Scene Bible × シーン数 ──────────────────────
    const sceneBibleMap: Record<string, Awaited<ReturnType<typeof generateSceneBible>>> = {}
    for (const scene of scenes) {
      const sbData = await generateSceneBible(scene, characterBibleData, videoStyleTone)
      sceneBibleMap[scene.id] = sbData

      await db
        .insert(sceneBibles)
        .values({ projectId, sceneId: scene.id, ...sbData })
        .onConflictDoUpdate({
          target: sceneBibles.sceneId,
          set: sbData,
        })
    }

    // ─── STEP 3: Transition Bible × (シーン数-1) ─────────────
    for (let i = 0; i < scenes.length - 1; i++) {
      const from = scenes[i]
      const to = scenes[i + 1]
      const tbData = await generateTransitionBible(from, to, characterBibleData)

      await db.insert(transitionBibles).values({
        projectId,
        fromSceneId: from.id,
        toSceneId: to.id,
        ...tbData,
      })
    }

    // ─── STEP 4: プロンプト生成 ───────────────────────────────
    for (const scene of scenes) {
      const sb = sceneBibleMap[scene.id]
      const promptData = await generateScenePrompts(scene, characterBibleData, sb)

      // 画像生成プロンプト
      await db.insert(generatedPrompts).values({
        projectId,
        sceneId: scene.id,
        promptType: 'image_generation',
        targetModel: 'flux',
        promptContent: promptData.imagePrompt,
        negativePrompt: promptData.negativePrompt,
      })

      // 動画生成プロンプト
      await db.insert(generatedPrompts).values({
        projectId,
        sceneId: scene.id,
        promptType: 'video_generation',
        targetModel: 'runway',
        promptContent: promptData.videoPrompt,
        negativePrompt: promptData.negativePrompt,
      })

      // ─── STEP 5: ナレーション ─────────────────────────────
      const narrationText = await generateNarration(
        scene,
        characterBibleData,
        videoStyleTone,
        person.fullName
      )

      await db.insert(narrationScripts).values({
        projectId,
        sceneId: scene.id,
        textContent: narrationText,
        emotionTone: scene.emotionalStage ?? 'warm',
      })
    }

    await db.update(projects).set({ status: 'review' }).where(eq(projects.id, projectId))

    return NextResponse.json({ success: true, message: '全工程の生成が完了しました' })
  } catch (error) {
    await db.update(projects).set({ status: 'draft' }).where(eq(projects.id, projectId))
    console.error('AI生成エラー:', error)
    return NextResponse.json(
      { error: 'AI生成中にエラーが発生しました', detail: String(error) },
      { status: 500 }
    )
  }
}
