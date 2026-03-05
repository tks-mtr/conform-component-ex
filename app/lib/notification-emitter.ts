import { EventEmitter } from 'node:events'

export type JobCompletedPayload = {
  jobId: string
  userId: string
  status: 'completed' | 'failed'
  result: Record<string, unknown>
}

// BFFプロセス内でRedis受信 → 各SSEクライアントへ分配するバス
export const notificationEmitter = new EventEmitter()