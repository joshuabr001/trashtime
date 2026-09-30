import { Module } from '@nestjs/common';
import { Database } from './database';
import { TrackingController, TrackingService } from './tracking';
import { ReportsController, ReportsService } from './reports';

@Module({
  controllers: [TrackingController, ReportsController],
  providers: [Database, TrackingService, ReportsService],
})
export class AppModule {}
