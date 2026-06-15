import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY
  const keyPreview = key ? `${key.slice(0, 20)}...（長さ:${key.length}）` : 'undefined'

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: key! })
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'say hi' }],
    })
    return NextResponse.json({ ok: true, keyPreview, response: msg.content })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      keyPreview,
      error: String(e),
      stack: e instanceof Error ? e.stack : undefined,
    })
  }
}
