import { Controller, Get } from '@nestjs/common';

import { Public } from '../../auth/decorators';
import { PortalLandingService } from '../services';

@Public()
@Controller('portal')
export class PortalLandingController {
  constructor(private readonly portalLandingService: PortalLandingService) {}

  @Get('landing')
  getLanding() {
    return this.portalLandingService.getLanding();
  }
}
