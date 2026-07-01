import { Injectable } from '@nestjs/common';

import {
  HeroSlidesService,
  PublicHeroSlideResponse,
  PublicQuickAccessResponse,
  QuickAccessesService,
} from '../../content/services';

export interface PortalLandingResponse {
  heroSlides: PublicHeroSlideResponse[];
  quickAccesses: PublicQuickAccessResponse[];
}

@Injectable()
export class PortalLandingService {
  constructor(
    private readonly heroSlidesService: HeroSlidesService,
    private readonly quickAccessesService: QuickAccessesService,
  ) {}

  async getLanding(): Promise<PortalLandingResponse> {
    const [heroSlides, quickAccesses] = await Promise.all([
      this.heroSlidesService.findActive(),
      this.quickAccessesService.findLanding(),
    ]);

    return { heroSlides, quickAccesses };
  }
}
