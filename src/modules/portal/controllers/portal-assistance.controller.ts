import { Controller, Get, Param, Query } from '@nestjs/common';
import { AssistanceService } from 'src/modules/learning/assistance.service';
import { PaginationParamsDto } from 'src/modules/common';

@Controller('portal/assistance')
export class PortalAssistanceController {
  constructor(private assistanceService: AssistanceService) {}

  @Get()
  findAll(@Query() queryParams: PaginationParamsDto) {
    return this.assistanceService.findAll(queryParams);
  }

  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.assistanceService.findBySlug(slug);
  }
}
