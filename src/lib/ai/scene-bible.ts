import { anthropic } from './client'
import type { ParsedScene } from '@/lib/types'
import type { CharacterBibleData } from './character-bible'

export type SceneBibleData = {
  visualDirection: string
  cameraMovement: string
  lightingMood: string
  colorGrading: string
  backgroundDetail: string
  wardrobeNotes: string
  timeOfDay: string
  season: string
  eraDetails: string
}

export type TransitionBibleData = {
  agingDescription: string
  postureChange: string
  gaitChange: string
  backgroundShift: string
  eraShift: string
  eraVisualCues: string[]
  emotionFrom: string
  emotionTo: string
  emotionalArc: string
  transitionStyle: string
  durationNote: string
}

export async function generateSceneBible(
  scene: ParsedScene,
  characterBible: CharacterBibleData,
  videoStyleTone: string
): Promise<SceneBibleData> {
  const agePeriod = getAgePeriod(scene.ageAtScene)
  const ageState = characterBible.lifeStageStates[agePeriod]
  const ageAppearance = characterBible.ageProgression[agePeriod]

  const prompt = `
あなたは映像演出家です。以下の情報から、1シーンの映像設計（Scene Bible）を生成してください。

## シーン情報
タイトル: ${scene.title}
年齢: ${scene.ageAtScene}歳（${scene.yearAtScene}年）
場所: ${scene.location}
出来事: ${scene.eventSummary}
感情: ${scene.emotionKeywords?.join('、')}
演出意図: ${scene.directionIntent}
感情ステージ: ${scene.emotionalStage}
内面: ${scene.innerMonologue}

## この年齢の主人公の状態
外見: 髪=${ageAppearance?.hair}、顔=${ageAppearance?.face}
姿勢: ${ageState?.posture}
歩き方: ${ageState?.gait}
目の表情: ${ageState?.eyeExpression}
精神状態: ${ageState?.mentalState}
雰囲気: ${ageState?.spiritualAura}

## 動画スタイル
${videoStyleTone}

## 出力形式（JSON）
{
  "visualDirection": "このシーンの映像的絵コンテ説明（2〜3文）",
  "cameraMovement": "カメラワーク（例：ゆっくりズームイン、横移動）",
  "lightingMood": "照明・光の設計",
  "colorGrading": "色調設計",
  "backgroundDetail": "背景の詳細",
  "wardrobeNotes": "服装・スタイリング",
  "timeOfDay": "時間帯",
  "season": "季節",
  "eraDetails": "時代考証（建物・街並み・小道具・流行）"
}

JSON以外は出力しないでください。
`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = codeBlock ? codeBlock[1] : (text.match(/\{[\s\S]*\}/) ?? [])[0]
  if (!raw) throw new Error(`Scene Bible生成に失敗: ${scene.title}`)

  return JSON.parse(raw) as SceneBibleData
}

export async function generateTransitionBible(
  fromScene: ParsedScene,
  toScene: ParsedScene,
  characterBible: CharacterBibleData
): Promise<TransitionBibleData> {
  const prompt = `
あなたは映像演出家です。2つのシーン間の「遷移設計（Transition Bible）」を生成してください。

この動画の核心は「連続性」です。
シーンAからシーンBへ、同じ人物が自然に年齢を重ねて見えることが最重要です。

## シーンA（前）
タイトル: ${fromScene.title}
年齢: ${fromScene.ageAtScene}歳
感情: ${fromScene.emotionKeywords?.join('、')}

## シーンB（後）
タイトル: ${toScene.title}
年齢: ${toScene.ageAtScene}歳
感情: ${toScene.emotionKeywords?.join('、')}

## 主人公の変化
前→後: ${fromScene.ageAtScene}歳から${toScene.ageAtScene}歳へ（${(toScene.ageAtScene ?? 0) - (fromScene.ageAtScene ?? 0)}年の変化）

## 出力形式（JSON）
{
  "agingDescription": "顔・体の年齢変化の描写",
  "postureChange": "姿勢の変化",
  "gaitChange": "歩き方・動作の変化",
  "backgroundShift": "背景・環境の変化",
  "eraShift": "時代の変化（例：昭和40年代 → 平成初期）",
  "eraVisualCues": ["時代を表す視覚的要素1", "要素2", "要素3"],
  "emotionFrom": "前シーンの感情",
  "emotionTo": "後シーンの感情",
  "emotionalArc": "感情の変化の本質（1文）",
  "transitionStyle": "映像的な遷移手法（ディゾルブ/モーフィング/フェードなど）",
  "durationNote": "遷移にかける時間感覚"
}

JSON以外は出力しないでください。
`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = codeBlock ? codeBlock[1] : (text.match(/\{[\s\S]*\}/) ?? [])[0]
  if (!raw) throw new Error(`Transition Bible生成に失敗: ${fromScene.title}→${toScene.title}`)

  return JSON.parse(raw) as TransitionBibleData
}

export function getAgePeriod(age: number | null | undefined): keyof CharacterBibleData['ageProgression'] {
  if (!age) return 'adult'
  if (age <= 5) return 'infant'
  if (age <= 12) return 'child'
  if (age <= 18) return 'teen'
  if (age <= 29) return 'young'
  if (age <= 49) return 'adult'
  if (age <= 64) return 'middle'
  return 'senior'
}
