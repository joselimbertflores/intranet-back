import { Injectable } from '@nestjs/common';

import {
  FeaturedBannersService,
  HeroSlidesService,
  LandingFeaturedBannerResponse,
  PublicHeroSlideResponse,
  PublicQuickAccessResponse,
  QuickAccessesService,
} from '../../content/services';

export interface PortalLandingResponse {
  heroSlides: PublicHeroSlideResponse[];
  quickAccesses: PublicQuickAccessResponse[];
  featuredBanners: LandingFeaturedBannerResponse[];
}

@Injectable()
export class PortalLandingService {
  constructor(
    private readonly heroSlidesService: HeroSlidesService,
    private readonly quickAccessesService: QuickAccessesService,
    private readonly featuredBannersService: FeaturedBannersService,
  ) {}

  async getLanding(): Promise<PortalLandingResponse> {
    const [heroSlides, quickAccesses, featuredBanners] = await Promise.all([
      this.heroSlidesService.findActive(),
      this.quickAccessesService.findLanding(),
      this.featuredBannersService.findLandingFeaturedBanners(),
    ]);

    return { heroSlides, quickAccesses, featuredBanners };
  }
}
