import { Injectable } from '@nestjs/common';

import { PublicCommunicationsService } from '../../communications/public-communications.service';
import { PublicContentService } from '../../content/services';
import { PublicDocumentsService } from '../../documents/services';

@Injectable()
export class PortalService {
  constructor(
    private readonly publicContentService: PublicContentService,
    private readonly publicCommunicationsService: PublicCommunicationsService,
    private readonly publicDocumentsService: PublicDocumentsService,
  ) {}

  async getLanding() {
    const [content, communications, mostConsultedDocuments] = await Promise.all([
      this.publicContentService.getLandingContent(),
      this.publicCommunicationsService.findLatest(6),
      this.publicDocumentsService.findMostConsultedForLanding(),
    ]);

    return { ...content, communications, mostConsultedDocuments };
  }
}
