import { anthropic } from './client'
import type { ParsedPerson } from '@/lib/types'

export type AgeProgression = {
  infant: AgePeriod
  child: AgePeriod
  teen: AgePeriod
  young: AgePeriod
  adult: AgePeriod
  middle: AgePeriod
  senior: AgePeriod
}

type AgePeriod = {
  hair: string
  face: string
  style: string
}

export type LifeStageStates = {
  infant: LifeStage
  child: LifeStage
  teen: LifeStage
  young: LifeStage
  adult: LifeStage
  middle: LifeStage
  senior: LifeStage
}

type LifeStage = {
  posture: string
  gait: string
  eyeExpression: string
  mentalState: string
  spiritualAura: string
}

export type CharacterBibleData = {
  faceCoreFeatures: string
  bodyType: string
  distinctiveMarks: string
  overallAtmosphere: string
  personalityVisuals: string
  ageProgression: AgeProgression
  lifeStageStates: LifeStageStates
  consistencyAnchor: string
}

export async function generateCharacterBible(
  person: ParsedPerson,
  photoAnalyses: string[],
  videoStyleTone: string
): Promise<CharacterBibleData> {
  const prompt = `
あなたは映像制作のキャラクター設定専門家です。
以下の情報から、生い立ちムービーのCharacter Bibleを生成してください。

## 主人公プロフィール
名前: ${person.fullName}
生年: ${person.birthYear}年
出身: ${person.birthPlace}
職業: ${person.occupation}
家族: ${person.familyStructure}
人柄: ${person.personalityNotes}
キーワード: ${person.specialKeywords?.join('、')}

## 写真分析結果
${photoAnalyses.map((a, i) => `写真${i + 1}: ${a}`).join('\n')}

## 動画スタイル
${videoStyleTone}

## 最重要要件
この動画の最大の価値は「連続性」と「同一人物性」です。
幼少期から高齢期まで、視聴者が「同じ人物が人生を歩いている」と
感じられることが絶対条件です。

## 出力形式
以下のJSON形式で出力してください:

{
  "faceCoreFeatures": "変わらない顔の核心特徴（日本語）",
  "bodyType": "体格・体型の特徴",
  "distinctiveMarks": "ほくろ・えくぼなど生涯変わらない特徴",
  "overallAtmosphere": "全体的な雰囲気・印象",
  "personalityVisuals": "性格が外見に表れる部分",
  "ageProgression": {
    "infant": { "hair": "...", "face": "...", "style": "..." },
    "child": { "hair": "...", "face": "...", "style": "..." },
    "teen": { "hair": "...", "face": "...", "style": "..." },
    "young": { "hair": "...", "face": "...", "style": "..." },
    "adult": { "hair": "...", "face": "...", "style": "..." },
    "middle": { "hair": "...", "face": "...", "style": "..." },
    "senior": { "hair": "...", "face": "...", "style": "..." }
  },
  "lifeStageStates": {
    "infant": { "posture": "...", "gait": "...", "eyeExpression": "...", "mentalState": "...", "spiritualAura": "..." },
    "child": { ... },
    "teen": { ... },
    "young": { ... },
    "adult": { ... },
    "middle": { ... },
    "senior": { ... }
  },
  "consistencyAnchor": "英語で書かれた、全プロンプトの先頭に挿入する人物統一記述。映像生成AI向けに最適化。同一人物として認識させる核心的特徴のみ。50語以内。"
}

JSON以外は出力しないでください。
`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = codeBlock ? codeBlock[1] : (text.match(/\{[\s\S]*\}/) ?? [])[0]
  if (!raw) throw new Error('Character Bible生成に失敗しました')

  return JSON.parse(raw) as CharacterBibleData
}
