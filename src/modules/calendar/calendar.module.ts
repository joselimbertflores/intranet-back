import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from './entities';
import { CommunicationsModule } from '../communications/communications.module';

@Module({
  providers: [CalendarService],
  controllers: [EventController],
  imports: [TypeOrmModule.forFeature([CalendarEvent]), CommunicationsModule],
})
export class CalendarModule {}
