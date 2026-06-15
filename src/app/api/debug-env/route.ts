import { NextResponse } from 'next/server'

export async function GET() {
  const vars = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'ANTHROPIC_API_KEY', 'BLOB_READ_WRITE_TOKEN', 'KLING_ACCESS_KEY_ID']
  const result: Record<string, { length: number; firstCharCode: number; hasBOM: boolean; preview: string }> = {}

  for (const name of vars) {
    const val = process.env[name] ?? ''
    const firstCode = val.charCodeAt(0)
    result[name] = {
      length: val.length,
      firstCharCode: firstCode,
      hasBOM: firstCode === 65279,
      preview: val.slice(0, 30),
    }
  }

  // DB接続テスト
  let dbOk = false
  let dbError = ''
  try {
    const { createClient } = await import('@libsql/client')
    const url = (process.env.TURSO_DATABASE_URL ?? '').replace(/^﻿/, '')
    const authToken = (process.env.TURSO_AUTH_TOKEN ?? '').replace(/^﻿/, '')
    const client = createClient({ url, authToken })
    await client.execute('SELECT 1')
    dbOk = true
  } catch (e) {
    dbError = String(e)
  }

  return NextResponse.json({ vars: result, dbOk, dbError })
}
