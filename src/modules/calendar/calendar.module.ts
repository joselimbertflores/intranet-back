import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from './entities';
import { CommunicationsModule } from '../communications/communications.module';
import { CalendarReadService } from './calendar-read.service';

@Module({
  providers: [CalendarService, CalendarReadService],
  controllers: [CalendarController],
  imports: [TypeOrmModule.forFeature([CalendarEvent]), CommunicationsModule],
  exports: [CalendarReadService],
})
export class CalendarModule {}
