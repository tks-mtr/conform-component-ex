import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { jobResults } from '../db/schema'
import type { JobResultDto } from './dto/job-result.dto'

@Injectable()
export class NotificationsService {
  /**
   * ログインユーザーの未読通知一覧を取得する。
   *
   * SSE切断中の取りこぼし防止のため、以下の2タイミングで呼ばれる:
   * - BFF の root.tsx loader 実行時（ページリロード・初回アクセス）
   * - SSE接続確立時（切断からの自動再接続を含む）
   *
   * @param userId - ログイン中のユーザーID
   * @returns is_notified=false のジョブ結果一覧（新しい順は呼び出し元で制御）
   */
  async getPendingNotifications(userId: string): Promise<JobResultDto[]> {
    return db
      .select()
      .from(jobResults)
      .where(
        and(
          eq(jobResults.userId, userId),
          eq(jobResults.isNotified, false),
        ),
      )
  }

  /**
   * 指定したジョブを既読状態（is_notified=true）に更新する。
   *
   * ユーザーが通知モーダルを閉じた（確認した）タイミングでクライアントから呼ばれる。
   * 対象ジョブが存在しない場合は NotFoundException をスローする。
   *
   * @param jobId - 既読化するジョブの識別子（job_results.job_id）
   * @throws NotFoundException 指定した jobId のレコードが存在しない場合
   */
  async markAsNotified(jobId: string): Promise<void> {
    const result = await db
      .update(jobResults)
      .set({ isNotified: true, updatedAt: new Date().toISOString() })
      .where(eq(jobResults.jobId, jobId))
      .returning({ id: jobResults.id })

    if (result.length === 0) {
      throw new NotFoundException(`jobId: ${jobId} が見つかりません`)
    }
  }
}
