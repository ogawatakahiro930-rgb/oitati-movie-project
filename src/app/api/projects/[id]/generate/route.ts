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

export const maxDuration = 300

const j = JSON.stringify

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const [person] = await db.select().from(persons).where(eq(persons.id, project.personId))

  const scenes = await db
    .select()
    .from(storyScenes)
    .where(eq(storyScenes.projectId, projectId))
    .orderBy(asc(storyScenes.orderIndex))

  if (scenes.length === 0) {
    return NextResponse.json({ error: 'シーンが登録されていません' }, { status: 400 })
  }

  const parsedScenes = scenes.map(s => ({
    ...s,
    emotionKeywords: s.emotionKeywords ? JSON.parse(s.emotionKeywords) as string[] : [],
  }))

  const parsedPerson = {
    ...person,
    specialKeywords: person.specialKeywords ? JSON.parse(person.specialKeywords) as string[] : [],
  }

  let videoStyleTone = '感動的で温かみのある映像スタイル'
  if (project.videoStyleId) {
    const [style] = await db.select().from(videoStyles).where(eq(videoStyles.id, project.videoStyleId))
    if (style) videoStyleTone = `${style.displayName}: ${style.description} (${style.visualTone})`
  }

  await db.update(projects).set({ status: 'generating' }).where(eq(projects.id, projectId))

  try {
    // 既存の生成データを削除（再生成対応）
    await db.delete(generatedPrompts).where(eq(generatedPrompts.projectId, projectId))
    await db.delete(narrationScripts).where(eq(narrationScripts.projectId, projectId))
    await db.delete(transitionBibles).where(eq(transitionBibles.projectId, projectId))
    await db.delete(sceneBibles).where(eq(sceneBibles.projectId, projectId))

    // ─── STEP 1: Character Bible ────────────────────────────
    const photoAnalyses = ['写真分析機能はVer2で実装予定。現在はプロフィール情報から生成します。']
    const cb = await generateCharacterBible(parsedPerson, photoAnalyses, videoStyleTone)

    const existing = await db.select().from(characterBibles).where(eq(characterBibles.projectId, projectId))
    if (existing.length > 0) {
      await db.update(characterBibles)
        .set({
          faceCoreFeatures: cb.faceCoreFeatures,
          bodyType: cb.bodyType,
          distinctiveMarks: cb.distinctiveMarks,
          overallAtmosphere: cb.overallAtmosphere,
          personalityVisuals: cb.personalityVisuals,
          ageProgression: j(cb.ageProgression),
          lifeStageStates: j(cb.lifeStageStates),
          consistencyAnchor: cb.consistencyAnchor,
          reviewed: false,
        })
        .where(eq(characterBibles.projectId, projectId))
    } else {
      await db.insert(characterBibles).values({
        projectId,
        faceCoreFeatures: cb.faceCoreFeatures,
        bodyType: cb.bodyType ?? '',
        distinctiveMarks: cb.distinctiveMarks ?? '',
        overallAtmosphere: cb.overallAtmosphere ?? '',
        personalityVisuals: cb.personalityVisuals ?? '',
        ageProgression: j(cb.ageProgression),
        lifeStageStates: j(cb.lifeStageStates),
        consistencyAnchor: cb.consistencyAnchor,
      })
    }

    // ─── STEP 2: Scene Bible × シーン数（並列） ─────────────
    const sceneBibleResults = await Promise.all(
      parsedScenes.map(scene => generateSceneBible(scene, cb, videoStyleTone))
    )

    const sceneBibleMap: Record<string, (typeof sceneBibleResults)[number]> = {}
    await Promise.all(
      parsedScenes.map(async (scene, i) => {
        const sb = sceneBibleResults[i]
        sceneBibleMap[scene.id] = sb
        await db.insert(sceneBibles).values({ projectId, sceneId: scene.id, ...sb })
      })
    )

    // ─── STEP 3: Transition Bible × (シーン数-1)（並列） ────
    await Promise.all(
      parsedScenes.slice(0, -1).map((fromScene, i) => {
        const toScene = parsedScenes[i + 1]
        return generateTransitionBible(fromScene, toScene, cb).then(tb =>
          db.insert(transitionBibles).values({
            projectId,
            fromSceneId: fromScene.id,
            toSceneId: toScene.id,
            ...tb,
            eraVisualCues: j(tb.eraVisualCues),
          })
        )
      })
    )

    // ─── STEP 4 & 5: プロンプト + ナレーション（シーン並列） ──
    await Promise.all(
      parsedScenes.map(async scene => {
        const sb = sceneBibleMap[scene.id]
        const [promptData, narrationText] = await Promise.all([
          generateScenePrompts(scene, cb, sb),
          generateNarration(scene, cb, videoStyleTone, parsedPerson.fullName),
        ])

        await db.insert(generatedPrompts).values({
          projectId,
          sceneId: scene.id,
          promptType: 'image_generation',
          targetModel: 'flux',
          promptContent: promptData.imagePrompt,
          negativePrompt: promptData.negativePrompt,
        })

        await db.insert(generatedPrompts).values({
          projectId,
          sceneId: scene.id,
          promptType: 'video_generation',
          targetModel: 'runway',
          promptContent: promptData.videoPrompt,
          negativePrompt: promptData.negativePrompt,
        })

        await db.insert(narrationScripts).values({
          projectId,
          sceneId: scene.id,
          textContent: narrationText,
          emotionTone: scene.emotionalStage ?? 'warm',
        })
      })
    )

    await db.update(projects).set({ status: 'review' }).where(eq(projects.id, projectId))
    return NextResponse.json({ success: true })
  } catch (error) {
    await db.update(projects).set({ status: 'draft' }).where(eq(projects.id, projectId))
    console.error('AI生成エラー:', error)
    return NextResponse.json({ error: 'AI生成中にエラーが発生しました', detail: String(error) }, { status: 500 })
  }
}
