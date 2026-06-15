import { anthropic } from './client'
import type { ParsedScene } from '@/lib/types'
import type { CharacterBibleData } from './character-bible'
import type { SceneBibleData } from './scene-bible'
import { getAgePeriod } from './scene-bible'

export type GeneratedScenePrompts = {
  imagePrompt: string
  videoPrompt: string
  negativePrompt: string
}

// ★ 同一人物性保証の核心
// consistencyAnchor を必ず先頭に配置し、年齢・感情・時代を重ねる
export async function generateScenePrompts(
  scene: ParsedScene,
  characterBible: CharacterBibleData,
  sceneBible: SceneBibleData
): Promise<GeneratedScenePrompts> {
  const agePeriod = getAgePeriod(scene.ageAtScene)
  const ageAppearance = characterBible.ageProgression[agePeriod]
  const ageState = characterBible.lifeStageStates[agePeriod]

  const prompt = `
あなたは映像生成AI向けプロンプトの専門家です。
以下の情報から、画像生成と動画生成のプロンプトを作成してください。

## 最重要原則
1. consistencyAnchorを必ずプロンプトの先頭に配置すること
2. 同一人物として認識できることが最優先
3. 英語で出力すること（画像/動画生成AIの精度のため）

## Consistency Anchor（全プロンプト共通・変更禁止）
${characterBible.consistencyAnchor}

## この年齢の外見
Age: ${scene.ageAtScene} years old
Appearance: ${ageAppearance?.hair}, ${ageAppearance?.face}, ${ageAppearance?.style}
Posture: ${ageState?.posture}
Gait: ${ageState?.gait}
Eye expression: ${ageState?.eyeExpression}
Mental state: ${ageState?.mentalState}

## シーン設定
Scene: ${scene.title}（${scene.yearAtScene}年）
Location: ${scene.location}
Event: ${scene.eventSummary}
Emotions: ${scene.emotionKeywords?.join(', ')}

## 映像設計
Visual direction: ${sceneBible.visualDirection}
Camera: ${sceneBible.cameraMovement}
Lighting: ${sceneBible.lightingMood}
Color: ${sceneBible.colorGrading}
Background: ${sceneBible.backgroundDetail}
Wardrobe: ${sceneBible.wardrobeNotes}
Era details: ${sceneBible.eraDetails}

## 出力形式（JSON）
{
  "imagePrompt": "静止画生成用プロンプト（英語、150語以内）。必ずconsistencyAnchorから始める。",
  "videoPrompt": "動画生成用プロンプト（英語、200語以内）。必ずconsistencyAnchorから始める。動きの描写を含む。",
  "negativePrompt": "ネガティブプロンプト（英語）。別人に見える要素、時代の不一致、低品質要素を指定。"
}

JSON以外は出力しないでください。
`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = codeBlock ? codeBlock[1] : (text.match(/\{[\s\S]*\}/) ?? [])[0]
  if (!raw) throw new Error(`プロンプト生成に失敗: ${scene.title}`)

  return JSON.parse(raw) as GeneratedScenePrompts
}

export async function generateNarration(
  scene: ParsedScene,
  characterBible: CharacterBibleData,
  videoStyleTone: string,
  personName: string
): Promise<string> {
  const prompt = `
あなたは感動的なナレーションライターです。
以下のシーンのナレーション原稿を書いてください。

## 主人公
${personName}さん、${scene.ageAtScene}歳

## シーン
${scene.title}（${scene.yearAtScene}年）
${scene.eventSummary}
感情: ${scene.emotionKeywords?.join('、')}
内面: ${scene.innerMonologue}
感情ステージ: ${scene.emotionalStage}

## 動画スタイル
${videoStyleTone}

## ナレーション要件
- 20〜40秒で読める分量（200〜400文字）
- 視聴者が「人生を追体験する」感覚になること
- 出来事の説明ではなく、感情・内面の表現
- テロップと重複しない（テロップは年号・場所）
- 体言止めや余韻を活かした文体

ナレーション本文のみを出力してください。説明文は不要です。
`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
