import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { AssistanceService } from './assistance.service';
import { CreateTutorialDto } from './dtos/tutorial.dto';
import { PaginationParamsDto } from '../common';

@Controller('assistance')
export class AssistanceController {
  constructor(private assistanceService: AssistanceService) {}
  @Post()
  create(@Body() body: CreateTutorialDto) {
    return this.assistanceService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: CreateTutorialDto) {
    return this.assistanceService.update(id, body);
  }

  @Get()
  findAll(@Query() queryParams: PaginationParamsDto) {
    return this.assistanceService.findAll(queryParams);
  }
}
