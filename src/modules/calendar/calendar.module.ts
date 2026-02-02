import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventController } from './event.controller';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from './entities';

@Module({
  providers: [CalendarService],
  controllers: [EventController],
  imports: [TypeOrmModule.forFeature([CalendarEvent])],
  exports: [TypeOrmModule],
})
export class CalendarModule {}
