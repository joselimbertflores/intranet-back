import { Controller, Get, Query } from '@nestjs/common';

import { GetPortalCommunicationsDto } from 'src/modules/communications/dtos/communication.dto';
import { PublicCommunicationsService } from 'src/modules/communications/public-communications.service';
import { Public } from 'src/modules/auth/decorators';

@Public()
@Controller('portal/communications')
export class PortalCommunicationsController {
  constructor(private readonly publicCommunicationsService: PublicCommunicationsService) {}

  @Get('types')
  getTypeCommunications() {
    return this.publicCommunicationsService.getTypes();
  }

  @Get()
  getPortalCommunications(@Query() queryParams: GetPortalCommunicationsDto) {
    return this.publicCommunicationsService.findAll(queryParams);
  }
}
