import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventController } from './event.controller';
import { Event } from './entities/event.entity';
import { EventService } from './event.service';

@Module({
  providers: [EventService],
  controllers: [EventController],
  imports: [TypeOrmModule.forFeature([Event])],
})
export class EventModule {}
