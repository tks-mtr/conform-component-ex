import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MockModule } from './mock/mock.module';

@Module({
  imports: [RedisModule, NotificationsModule, MockModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
