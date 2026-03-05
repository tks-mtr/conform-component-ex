import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const jobResults = sqliteTable('job_results', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull(),
  userId: text('user_id').notNull(),
  status: text('status', { enum: ['processing', 'completed', 'failed'] }).notNull(),
  payload: text('payload'),
  isNotified: integer('is_notified', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export type JobResult = typeof jobResults.$inferSelect
export type NewJobResult = typeof jobResults.$inferInsert