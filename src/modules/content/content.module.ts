import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContentAdminController } from './controllers';
import { FeaturedBannersService, HeroSlidesService, QuickAccessesService } from './services';
import { FeaturedBanner, HeroSlide, QuickAccess } from './entities';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([HeroSlide, QuickAccess, FeaturedBanner]), FilesModule],
  controllers: [ContentAdminController],
  providers: [HeroSlidesService, QuickAccessesService, FeaturedBannersService],
  exports: [HeroSlidesService, QuickAccessesService, FeaturedBannersService],
})
export class ContentModule {}
