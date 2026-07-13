import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { GetPortalCommunicationsDto } from 'src/modules/communications/dtos/communication.dto';
import { CommunicationService } from 'src/modules/communications/communication.service';
import { Public } from 'src/modules/auth/decorators';

@Public()
@Controller('portal/communications')
export class PortalCommunicationsController {
  constructor(private coomunicationService: CommunicationService) {}

  @Get('types')
  getTypeCommunications() {
    return this.coomunicationService.getTypes();
  }
  @Get()
  getPortalCommunications(@Query() queryParams: GetPortalCommunicationsDto) {
    return this.coomunicationService.getPortalCommunications(queryParams);
  }
}
