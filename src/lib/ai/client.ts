import Anthropic from '@anthropic-ai/sdk'

type AnthropicClient = Anthropic

let _client: AnthropicClient | undefined

function getClient(): AnthropicClient {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })
  }
  return _client
}

export const anthropic: AnthropicClient = new Proxy({} as AnthropicClient, {
  get(_, key) {
    return Reflect.get(getClient(), key)
  },
})
