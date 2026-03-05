import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { db } from '../db'
import { jobResults } from '../db/schema'
import { RedisService } from '../redis/redis.service'

export type TriggerJobDto = {
  jobId: string
  userId: string
  result: Record<string, unknown>
}

@Injectable()
export class MockService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * 外部システムによるジョブ完了イベントを模倣する開発用メソッド。
   *
   * 以下の処理を順に実行する:
   * 1. job_results テーブルに完了レコードを INSERT する
   * 2. Redis の `job:completed` チャンネルへペイロードを PUBLISH する
   *
   * @param dto.jobId  - 完了させるジョブの識別子
   * @param dto.userId - 通知対象のユーザーID
   * @param dto.result - クライアントに通知する処理結果オブジェクト
   */
  async triggerJob(dto: TriggerJobDto): Promise<void> {
    const { jobId, userId, result } = dto

    // 1. DBにジョブ完了レコードを登録
    await db.insert(jobResults).values({
      id: randomUUID(),
      jobId,
      userId,
      status: 'completed',
      payload: JSON.stringify(result),
      isNotified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // 2. Redisへ PUBLISH
    const payload = JSON.stringify({ jobId, userId, status: 'completed', result })
    await this.redisService.publish('job:completed', payload)
  }
}