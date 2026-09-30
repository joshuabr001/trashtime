import { Module } from '@nestjs/common';
import { Database } from './database';
import { TrackingController, TrackingService } from './tracking';

@Module({
  controllers: [TrackingController],
  providers: [Database, TrackingService],
})
export class AppModule {}
