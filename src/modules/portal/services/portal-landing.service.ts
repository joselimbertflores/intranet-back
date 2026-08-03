import { Injectable } from '@nestjs/common';

import { PublicCommunicationsService } from '../../communications/public-communications.service';
import { PublicDocumentsService } from '../../documents/services';
import { PublicLandingContentService } from '../../portal-content/services';

@Injectable()
export class PortalLandingService {
  constructor(
    private readonly publicLandingContentService: PublicLandingContentService,
    private readonly publicCommunicationsService: PublicCommunicationsService,
    private readonly publicDocumentsService: PublicDocumentsService,
  ) {}

  async getLanding() {
    const [heroSlides, quickAccesses, featuredBanners, landingNotices, latestCommunications, mostDownloadedDocuments] =
      await Promise.all([
        this.publicLandingContentService.findHeroSlides(),
        this.publicLandingContentService.findQuickAccesses(10),
        this.publicLandingContentService.findFeaturedBanners(),
        this.publicLandingContentService.findLandingNotices(),
        this.publicCommunicationsService.findLatest(6),
        this.publicDocumentsService.findMostDownloaded(8),
      ]);

    return {
      heroSlides,
      quickAccesses: quickAccesses.slice(0, 10),
      hasMoreQuickAccesses: quickAccesses.length >= 10,
      featuredBanners,
      landingNotices,
      latestCommunications,
      mostDownloadedDocuments,
    };
  }
}
