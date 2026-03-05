import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { createClient, RedisClientType } from 'redis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client: RedisClientType

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    }) as RedisClientType
  }

  async onModuleInit() {
    await this.client.connect()
    this.logger.log('Redisに接続しました')
  }

  async onModuleDestroy() {
    await this.client.quit()
    this.logger.log('Redis接続を切断しました')
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message)
  }
}