import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as path from 'node:path'
import * as schema from './schema'

const sqlite = new Database(process.env.DATABASE_PATH ?? 'db/app.db')

// WALモードで並行読取りを最大化
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })

// アプリ起動時に自動マイグレーション
// watch mode / 本番ビルド両方に対応するため process.cwd() ベースで解決
const migrationsFolder = path.resolve(process.cwd(), 'src/db/migrations')
migrate(db, { migrationsFolder })