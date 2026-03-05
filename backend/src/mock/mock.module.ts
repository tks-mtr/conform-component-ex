import { Module } from '@nestjs/common'
import { MockService } from './mock.service'
import { MockController } from './mock.controller'
import { RedisModule } from '../redis/redis.module'

@Module({
  imports: [RedisModule],
  controllers: [MockController],
  providers: [MockService],
})
export class MockModule {}