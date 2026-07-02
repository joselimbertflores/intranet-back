import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContentAdminController } from './controllers';
import {
  FeaturedBannersService,
  HeroSlidesService,
  LandingModalNoticesService,
  QuickAccessesService,
} from './services';
import { FeaturedBanner, HeroSlide, LandingModalNotice, QuickAccess } from './entities';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([HeroSlide, QuickAccess, FeaturedBanner, LandingModalNotice]), FilesModule],
  controllers: [ContentAdminController],
  providers: [HeroSlidesService, QuickAccessesService, FeaturedBannersService, LandingModalNoticesService],
  exports: [HeroSlidesService, QuickAccessesService, FeaturedBannersService, LandingModalNoticesService],
})
export class ContentModule {}
