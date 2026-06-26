import { Controller, Get, Param, Patch } from '@nestjs/common';

import { DocumentSearchService } from '../../documents/services';
import { BannerService, QuickAccessItemService } from '../../content/services';
import { Public } from '../../auth/decorators';
import { CommunicationService } from 'src/modules/communications/communication.service';

@Public()
@Controller('portal')
export class PortalController {
  constructor(
    private quickAccessService: QuickAccessItemService,
    private bannerService: BannerService,
    private documentService: DocumentSearchService,
    private communicationService: CommunicationService,
  ) {}

  @Get('home')
  async getHomeData() {
    const [quickAccess, banners, communications, documents] = await Promise.all([
      this.quickAccessService.findAll(),
      this.bannerService.findAll(),
      this.communicationService.getLatestCommunications(),
      this.documentService.getMostDownloaded(),
    ]);

    return {
      quickAccess,
      banners,
      communications,
      documents,
    };
  }

  @Patch('document/:id/increment-download')
  incrementDownload(@Param('id') id: string) {
    return this.documentService.incrementDownloadCount(id);
  }
}
