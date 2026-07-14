import { Controller, Get } from '@nestjs/common';

import { Public } from '../../auth/decorators';
import { PortalService } from '../services';

@Public()
@Controller('portal')
export class PortalLandingController {
  constructor(private readonly portalService: PortalService) {}

  @Get('landing')
  getLanding() {
    return this.portalService.getLanding();
  }
}
