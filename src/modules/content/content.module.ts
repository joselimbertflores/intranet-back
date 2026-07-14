import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContentAdminController } from './controllers';
import {
  FeaturedBannersService,
  HeroSlidesService,
  LandingNoticesService,
  PublicContentService,
  QuickAccessesService,
} from './services';
import { FeaturedBanner, HeroSlide, LandingNotice, QuickAccess } from './entities';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([HeroSlide, QuickAccess, FeaturedBanner, LandingNotice]), FilesModule],
  controllers: [ContentAdminController],
  providers: [
    HeroSlidesService,
    QuickAccessesService,
    FeaturedBannersService,
    LandingNoticesService,
    PublicContentService,
  ],
  exports: [PublicContentService],
})
export class ContentModule {}
