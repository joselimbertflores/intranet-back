import { Controller, Get } from '@nestjs/common';

import { Public } from '../../auth/decorators';
import { PublicLandingContentService } from '../../portal-content/services';
import { PortalLandingService } from '../services';

@Public()
@Controller('portal')
export class PortalLandingController {
  constructor(
    private readonly portalLandingService: PortalLandingService,
    private readonly publicLandingContentService: PublicLandingContentService,
  ) {}

  @Get('landing')
  getLanding() {
    return this.portalLandingService.getLanding();
  }

  @Get('quick-accesses')
  getQuickAccesses() {
    return this.publicLandingContentService.findQuickAccesses();
  }
}
