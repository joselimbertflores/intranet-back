import { Injectable } from '@nestjs/common';

import { PublicCommunicationsService } from '../../communications/public-communications.service';
import { PublicLandingContentService } from '../../portal-content/services';
import { PublicDocumentsService } from '../../documents/services';

@Injectable()
export class PortalService {
  constructor(
    private readonly publicLandingContentService: PublicLandingContentService,
    private readonly publicCommunicationsService: PublicCommunicationsService,
    private readonly publicDocumentsService: PublicDocumentsService,
  ) {}

  async getLanding() {
    const [content, communications, mostConsultedDocuments] = await Promise.all([
      this.publicLandingContentService.getLandingContent(),
      this.publicCommunicationsService.findLatest(6),
      this.publicDocumentsService.findMostDownloaded(),
    ]);

    return { ...content, communications, mostConsultedDocuments };
  }
}
