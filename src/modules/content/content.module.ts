import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContentAdminController } from './controllers';
import { HeroSlidesService, QuickAccessesService } from './services';
import { HeroSlide, QuickAccess } from './entities';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([HeroSlide, QuickAccess]), FilesModule],
  controllers: [ContentAdminController],
  providers: [HeroSlidesService, QuickAccessesService],
  exports: [HeroSlidesService, QuickAccessesService],
})
export class ContentModule {}
