import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/ai/client'

export const maxDuration = 60

const EMOTIONAL_STAGES = ['hope', 'challenge', 'effort', 'turning_point', 'success', 'legacy', 'message']

export async function POST(req: NextRequest) {
  const { lifeStoryText, sceneCount, personInfo, styleKey } = await req.json()

  if (!lifeStoryText || !sceneCount) {
    return NextResponse.json({ error: '生い立ちテキストとシーン数が必要です' }, { status: 400 })
  }

  const styleLabels: Record<string, string> = {
    emotional: '感動系', family: '家族愛', entrepreneur: '経営者人生',
    passionate: '熱血人生', challenge: '挑戦の人生', community: '地域貢献',
  }

  const prompt = `あなたは生い立ちムービー制作の専門家です。以下の人物情報と生い立ちテキストを読んで、映像化に最適な${sceneCount}個のシーンを提案してください。

【人物情報】
名前: ${personInfo?.fullName ?? '未設定'}
生まれ年: ${personInfo?.birthYear ?? '不明'}年
出身地: ${personInfo?.birthPlace ?? '未設定'}
職業: ${personInfo?.occupation ?? '未設定'}
家族構成: ${personInfo?.familyStructure ?? '未設定'}
人柄メモ: ${personInfo?.personalityNotes ?? 'なし'}
キーワード: ${personInfo?.specialKeywords?.join('、') ?? 'なし'}
動画スタイル: ${styleLabels[styleKey] ?? styleKey}

【生い立ちテキスト】
${lifeStoryText}

以下の条件でシーンを選んでください：
- 感情的な起伏があり映像として美しく表現できる瞬間
- 人生の転換点・印象的な出来事を優先
- シーンを通じて一つの感情的な旅路（起承転結）になるように構成

必ず以下のJSON形式のみで返答してください。余計な説明は不要です：

{
  "scenes": [
    {
      "title": "シーンの短いタイトル（10文字以内）",
      "ageAtScene": 年齢の数字またはnull,
      "yearAtScene": 西暦の数字またはnull,
      "location": "具体的な場所",
      "eventSummary": "出来事の概要（2〜3文で具体的に）",
      "emotionKeywords": ["感情キーワード1", "感情キーワード2", "感情キーワード3"],
      "emotionalStage": "${EMOTIONAL_STAGES.join('|')}のいずれか",
      "innerMonologue": "主人公のその時の心の声（一言）"
    }
  ]
}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // コードブロック内のJSONを優先して抽出、なければ {} ブロックを探す
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const rawJson = codeBlockMatch ? codeBlockMatch[1] : (text.match(/\{[\s\S]*\}/) ?? [])[0]
  if (!rawJson) {
    return NextResponse.json({ error: 'AI応答の解析に失敗しました' }, { status: 500 })
  }

  let parsed: { scenes?: Record<string, unknown>[] }
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return NextResponse.json({ error: 'AI応答のJSON解析に失敗しました' }, { status: 500 })
  }
  const scenes = (parsed.scenes ?? []).slice(0, sceneCount).map((s) => ({
    title: String(s.title ?? ''),
    ageAtScene: typeof s.ageAtScene === 'number' ? s.ageAtScene : null,
    yearAtScene: typeof s.yearAtScene === 'number' ? s.yearAtScene : null,
    location: String(s.location ?? ''),
    eventSummary: String(s.eventSummary ?? ''),
    emotionKeywords: Array.isArray(s.emotionKeywords) ? s.emotionKeywords.map(String) : [],
    emotionalStage: EMOTIONAL_STAGES.includes(String(s.emotionalStage)) ? String(s.emotionalStage) : 'hope',
    innerMonologue: String(s.innerMonologue ?? ''),
  }))

  return NextResponse.json({ scenes })
}
