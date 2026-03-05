import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const sqlite = new Database(process.env.DATABASE_PATH ?? 'db/app.db')

// WALモードで並行読取りを最大化
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })