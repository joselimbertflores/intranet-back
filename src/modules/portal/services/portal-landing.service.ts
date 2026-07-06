import { Injectable } from '@nestjs/common';

import {
  FeaturedBannersService,
  HeroSlidesService,
  LandingNoticesService,
  QuickAccessesService,
} from '../../content/services';

@Injectable()
export class PortalLandingService {
  constructor(
    private readonly heroSlidesService: HeroSlidesService,
    private readonly quickAccessesService: QuickAccessesService,
    private readonly featuredBannersService: FeaturedBannersService,
    private readonly landingNoticesService: LandingNoticesService,
  ) {}

  async getLanding() {
    const [heroSlides, quickAccesses, featuredBanners, landingNotices] = await Promise.all([
      this.heroSlidesService.findActive(),
      this.quickAccessesService.findLanding(),
      this.featuredBannersService.findLandingFeaturedBanners(),
      this.landingNoticesService.findVisible(),
    ]);

    return { heroSlides, quickAccesses, featuredBanners, landingNotices };
  }
}
