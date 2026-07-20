import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PortalContentAdminController } from './controllers';
import {
  FeaturedBannersService,
  HeroSlidesService,
  LandingNoticesService,
  PublicLandingContentService,
  QuickAccessesService,
} from './services';
import { FeaturedBanner, HeroSlide, LandingNotice, QuickAccess } from './entities';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([HeroSlide, QuickAccess, FeaturedBanner, LandingNotice]), FilesModule],
  controllers: [PortalContentAdminController],
  providers: [
    HeroSlidesService,
    QuickAccessesService,
    FeaturedBannersService,
    LandingNoticesService,
    PublicLandingContentService,
  ],
  exports: [PublicLandingContentService],
})
export class PortalContentModule {}
