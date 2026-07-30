import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PublicCommunicationsService } from './public-communications.service';
import { CommunicationController } from './communication.controller';
import { CommunicationsService } from './communications.service';
import { Communication, CommunicationType } from './entities';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([Communication, CommunicationType]), FilesModule],
  providers: [CommunicationsService, PublicCommunicationsService],
  controllers: [CommunicationController],
  exports: [CommunicationsService, PublicCommunicationsService],
})
export class CommunicationsModule {}
