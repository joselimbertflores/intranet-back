import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from './entities';
import { CommunicationsModule } from '../communications/communications.module';
import { PublicCalendarService } from './public-calendar.service';

@Module({
  providers: [CalendarService, PublicCalendarService],
  controllers: [CalendarController],
  imports: [TypeOrmModule.forFeature([CalendarEvent]), CommunicationsModule],
  exports: [PublicCalendarService],
})
export class CalendarModule {}
