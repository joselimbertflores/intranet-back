import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssistanceService } from './assistance.service';
import { AssistanceController } from './assistance.controller';
import { Tutorial, TutorialVideo } from './entities';
import { FilesModule } from '../files/files.module';

@Module({
  controllers: [AssistanceController],
  providers: [AssistanceService],
  imports: [TypeOrmModule.forFeature([Tutorial, TutorialVideo]), FilesModule],
  exports: [AssistanceService],
})
export class AssistanceModule {}
