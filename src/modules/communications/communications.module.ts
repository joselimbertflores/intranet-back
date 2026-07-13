import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { Communication, CommunicationType } from './entities';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([Communication, CommunicationType]), FilesModule],
  providers: [CommunicationService],
  controllers: [CommunicationController],
  exports: [CommunicationService],
})
export class CommunicationsModule {}
