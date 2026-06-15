import Anthropic from '@anthropic-ai/sdk'

type AnthropicClient = Anthropic

let _client: AnthropicClient | undefined

function getClient(): AnthropicClient {
  if (!_client) {
    // BOM（﻿）が混入している場合に除去
    const apiKey = (process.env.ANTHROPIC_API_KEY ?? '').replace(/^﻿/, '')
    _client = new Anthropic({ apiKey })
  }
  return _client
}

export const anthropic: AnthropicClient = new Proxy({} as AnthropicClient, {
  get(_, key) {
    return Reflect.get(getClient(), key)
  },
})
