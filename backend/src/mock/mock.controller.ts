import { Controller, Post, Body, HttpCode } from '@nestjs/common'
import { MockService, type TriggerJobDto } from './mock.service'

@Controller('mock')
export class MockController {
  constructor(private readonly mockService: MockService) {}

  /**
   * ジョブ完了イベントを手動発火する開発・デモ用エンドポイント。
   *
   * DB INSERT と Redis PUBLISH を実行し、BFF経由でクライアントへ
   * SSEプッシュ通知が届くことを確認するために使用する。
   *
   * @param body.jobId  - 完了させるジョブの識別子
   * @param body.userId - 通知対象のユーザーID
   * @param body.result - クライアントに通知する処理結果オブジェクト
   */
  @Post('trigger-job')
  @HttpCode(204)
  async triggerJob(@Body() body: TriggerJobDto): Promise<void> {
    await this.mockService.triggerJob(body)
  }
}