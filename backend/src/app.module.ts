import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [RedisModule, NotificationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
