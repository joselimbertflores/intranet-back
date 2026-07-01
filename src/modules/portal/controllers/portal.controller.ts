import { Controller, Get, Param, Patch } from '@nestjs/common';

import { DocumentSearchService } from '../../documents/services';
import { QuickAccessesService } from '../../content/services';
import { Public } from '../../auth/decorators';
import { CommunicationService } from 'src/modules/communications/communication.service';

@Public()
@Controller('portal')
export class PortalController {
  constructor(
    private quickAccessesService: QuickAccessesService,
    private documentService: DocumentSearchService,
    private communicationService: CommunicationService,
  ) {}

  @Get('home')
  async getHomeData() {
    const [quickAccess, communications, documents] = await Promise.all([
      this.quickAccessesService.findLanding(),
      this.communicationService.getLatestCommunications(),
      this.documentService.getMostDownloaded(),
    ]);

    return {
      quickAccess,
      communications,
      documents,
    };
  }

  @Patch('document/:id/increment-download')
  incrementDownload(@Param('id') id: string) {
    return this.documentService.incrementDownloadCount(id);
  }
}
