import { Injectable } from '@nestjs/common';

import {
  FeaturedBannersService,
  HeroSlidesService,
  LandingNoticesService,
  QuickAccessesService,
} from '../../content/services';
import { CommunicationService } from '../../communications/communication.service';
import { PublicDocumentService } from 'src/modules/documents/services';

@Injectable()
export class PortalLandingService {
  constructor(
    private readonly heroSlidesService: HeroSlidesService,
    private readonly quickAccessesService: QuickAccessesService,
    private readonly featuredBannersService: FeaturedBannersService,
    private readonly landingNoticesService: LandingNoticesService,
    private readonly communicationService: CommunicationService,
    private readonly documentService: PublicDocumentService,
  ) {}

  async getLanding() {
    const [heroSlides, quickAccesses, featuredBanners, landingNotices, communications, mostConsultedDocuments] =
      await Promise.all([
        this.heroSlidesService.findActive(),
        this.quickAccessesService.findLanding(),
        this.featuredBannersService.findLandingFeaturedBanners(),
        this.landingNoticesService.findVisible(),
        this.communicationService.getLatestCommunications(6),
        this.documentService.findMostConsultedForLanding(),
      ]);
    return { heroSlides, quickAccesses, featuredBanners, landingNotices, communications, mostConsultedDocuments };
  }
}
