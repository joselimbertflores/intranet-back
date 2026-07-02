import { Injectable } from '@nestjs/common';

import {
  FeaturedBannersService,
  HeroSlidesService,
  LandingFeaturedBannerResponse,
  LandingModalNoticesService,
  PublicHeroSlideResponse,
  PublicQuickAccessResponse,
  QuickAccessesService,
} from '../../content/services';

// export interface PortalLandingResponse {
//   heroSlides: PublicHeroSlideResponse[];
//   quickAccesses: PublicQuickAccessResponse[];
//   featuredBanners: LandingFeaturedBannerResponse[];
//   modalNotices: PublicLandingModalNoticeResponse[];
// }

@Injectable()
export class PortalLandingService {
  constructor(
    private readonly heroSlidesService: HeroSlidesService,
    private readonly quickAccessesService: QuickAccessesService,
    private readonly featuredBannersService: FeaturedBannersService,
    private readonly landingModalNoticesService: LandingModalNoticesService,
  ) {}

  async getLanding() {
    const [heroSlides, quickAccesses, featuredBanners, modalNotices] = await Promise.all([
      this.heroSlidesService.findActive(),
      this.quickAccessesService.findLanding(),
      this.featuredBannersService.findLandingFeaturedBanners(),
      this.landingModalNoticesService.findVisible(),
    ]);

    return { heroSlides, quickAccesses, featuredBanners, modalNotices };
  }
}
