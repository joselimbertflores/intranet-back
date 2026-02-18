import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FilesModule } from '../files/files.module';
import { TutorialBlockService, TutorialCategoryService, TutorialService } from './services';
import { Tutorial, TutorialBlock, TutorialCategory } from './entities';
import { TutorialCategoryController, TutorialController } from './controllers';

@Module({
  controllers: [TutorialCategoryController, TutorialController],
  providers: [TutorialCategoryService, TutorialService, TutorialBlockService],
  imports: [TypeOrmModule.forFeature([Tutorial, TutorialCategory, TutorialBlock]), FilesModule],
  exports: [],
})
export class TutorialModule {}
