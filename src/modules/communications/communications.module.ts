import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { Communication, TypeCommunication } from './entities';
import { CalendarModule } from '../calendar/calendar.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([Communication, TypeCommunication]), FilesModule, CalendarModule],
  providers: [CommunicationService],
  controllers: [CommunicationController],
  exports: [CommunicationService],
})
export class CommunicationsModule {}
