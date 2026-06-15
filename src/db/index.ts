import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

type DB = ReturnType<typeof drizzle<typeof schema>>

let _db: DB | undefined

const bom = /^﻿/

function getDb(): DB {
  if (!_db) {
    _db = drizzle(
      createClient({
        url: (process.env.TURSO_DATABASE_URL ?? '').replace(bom, ''),
        authToken: (process.env.TURSO_AUTH_TOKEN ?? '').replace(bom, ''),
      }),
      { schema }
    )
  }
  return _db
}

// Proxy で遅延初期化 — モジュール読み込み時ではなく初回アクセス時に接続
export const db: DB = new Proxy({} as DB, {
  get(_, key) { return Reflect.get(getDb(), key) },
})
