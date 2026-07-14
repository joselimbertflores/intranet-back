import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FilesModule } from '../files/files.module';
import { PublicTutorialsService, TutorialBlockService, TutorialCategoryService, TutorialService } from './services';
import { TutorialCategoryController, TutorialController } from './controllers';
import { Tutorial, TutorialBlock, TutorialCategory } from './entities';

@Module({
  controllers: [TutorialCategoryController, TutorialController],
  providers: [TutorialCategoryService, TutorialService, TutorialBlockService, PublicTutorialsService],
  imports: [TypeOrmModule.forFeature([Tutorial, TutorialCategory, TutorialBlock]), FilesModule],
  exports: [PublicTutorialsService],
})
export class TutorialModule {}
