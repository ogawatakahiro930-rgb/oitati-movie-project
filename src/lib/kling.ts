import crypto from 'crypto'

const KLING_BASE_URL = 'https://api.klingai.com'

function generateToken(keyId: string, keySecret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { iss: keyId, exp: now + 1800, nbf: now - 5 }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const signature = crypto
    .createHmac('sha256', keySecret)
    .update(signingInput)
    .digest('base64url')

  return `${signingInput}.${signature}`
}

function getCredentials() {
  const keyId = process.env.KLING_ACCESS_KEY_ID
  const keySecret = process.env.KLING_ACCESS_KEY_SECRET
  if (!keyId || !keySecret) throw new Error('Kling APIキーが設定されていません')
  return { keyId, keySecret }
}

export type KlingVideoRequest = {
  prompt: string
  negativePrompt?: string
  duration?: 5 | 10
  aspectRatio?: '16:9' | '9:16' | '1:1'
  mode?: 'standard' | 'pro'
}

export type KlingTaskStatus = 'processing' | 'completed' | 'failed'

export async function createVideoTask(req: KlingVideoRequest): Promise<string> {
  const { keyId, keySecret } = getCredentials()
  const token = generateToken(keyId, keySecret)

  const res = await fetch(`${KLING_BASE_URL}/v1/videos/text2video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: 'kling-v1-6',
      prompt: req.prompt,
      negative_prompt: req.negativePrompt ?? 'text, watermark, blurry, low quality, duplicate person',
      duration: req.duration ?? 10,
      aspect_ratio: req.aspectRatio ?? '16:9',
      mode: req.mode ?? 'standard',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Kling API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const taskId = data?.data?.task_id ?? data?.task_id
  if (!taskId) throw new Error('タスクIDの取得に失敗しました')

  return taskId as string
}

export async function getVideoTaskStatus(
  taskId: string
): Promise<{ status: KlingTaskStatus; videoUrl?: string; error?: string }> {
  const { keyId, keySecret } = getCredentials()
  const token = generateToken(keyId, keySecret)

  const res = await fetch(`${KLING_BASE_URL}/v1/videos/text2video/${taskId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Kling status error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const taskData = data?.data ?? data
  const status: string = taskData?.task_status ?? taskData?.status ?? 'processing'

  if (status === 'succeed' || status === 'completed') {
    const videos = taskData?.task_result?.videos ?? taskData?.videos ?? []
    const videoUrl: string = videos[0]?.url ?? ''
    return { status: 'completed', videoUrl }
  }

  if (status === 'failed') {
    const error = taskData?.task_status_msg ?? taskData?.error ?? '生成に失敗しました'
    return { status: 'failed', error }
  }

  return { status: 'processing' }
}
