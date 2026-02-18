import { Controller, Get, Param, Query } from '@nestjs/common';
import { PaginationParamsDto } from 'src/modules/common';

@Controller('portal/assistance')
export class PortalAssistanceController {
  constructor() {}

  // @Get()
  // findAll(@Query() queryParams: PaginationParamsDto) {
  //   return this.assistanceService.findAll(queryParams);
  // }

  // @Get(':slug')
  // getOne(@Param('slug') slug: string) {
  //   return this.assistanceService.findBySlug(slug);
  // }
}
