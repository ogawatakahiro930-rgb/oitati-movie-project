import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

type DB = ReturnType<typeof drizzle<typeof schema>>

let _db: DB | undefined

function getDb(): DB {
  if (!_db) {
    _db = drizzle(
      createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
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
