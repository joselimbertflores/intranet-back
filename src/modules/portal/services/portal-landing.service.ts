import { Injectable } from '@nestjs/common';

import {
  FeaturedBannersService,
  HeroSlidesService,
  LandingNoticesService,
  QuickAccessesService,
} from '../../content/services';
import { CommunicationService } from '../../communications/communication.service';

@Injectable()
export class PortalLandingService {
  constructor(
    private readonly heroSlidesService: HeroSlidesService,
    private readonly quickAccessesService: QuickAccessesService,
    private readonly featuredBannersService: FeaturedBannersService,
    private readonly landingNoticesService: LandingNoticesService,
    private readonly communicationService: CommunicationService,
  ) {}

  async getLanding() {
    const [heroSlides, quickAccesses, featuredBanners, landingNotices, communications] = await Promise.all([
      this.heroSlidesService.findActive(),
      this.quickAccessesService.findLanding(),
      this.featuredBannersService.findLandingFeaturedBanners(),
      this.landingNoticesService.findVisible(),
      this.communicationService.getLatestCommunications(6),
    ]);

    return { heroSlides, quickAccesses, featuredBanners, landingNotices, communications };
  }
}
