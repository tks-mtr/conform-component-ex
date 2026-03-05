import { Controller, Get, Post, Param, Query, HttpCode } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import type { JobResultDto } from './dto/job-result.dto'

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * ログインユーザーの未読通知一覧を返す。
   *
   * BFF の root.tsx loader および SSE接続確立時に呼ばれる。
   * SSE切断中に完了したジョブをサルベージするために使用する。
   *
   * @param userId - クエリパラメータで受け取るログイン中のユーザーID
   * @returns 未読（is_notified=false）のジョブ結果一覧
   */
  @Get('pending')
  async getPending(@Query('userId') userId: string): Promise<JobResultDto[]> {
    return this.notificationsService.getPendingNotifications(userId)
  }

  /**
   * 指定したジョブを既読状態に更新する。
   *
   * ユーザーが通知モーダルを閉じたタイミングでクライアントから呼ばれる。
   * 通信エラー時はクライアント側でリトライする仕様のため、204を返す。
   *
   * @param jobId - パスパラメータで受け取る既読化するジョブID
   */
  @Post(':jobId/read')
  @HttpCode(204)
  async markAsRead(@Param('jobId') jobId: string): Promise<void> {
    await this.notificationsService.markAsNotified(jobId)
  }
}