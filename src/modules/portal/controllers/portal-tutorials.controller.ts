import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from 'src/modules/auth/decorators';
import { GetPortalTutorialsDto } from 'src/modules/tutorial/dtos';
import { PublicTutorialsService } from 'src/modules/tutorial/services';

@Public()
@Controller('portal-tutorials')
export class PortalTutorialsController {
  constructor(private readonly publicTutorialsService: PublicTutorialsService) {}

  @Get('categories')
  getCategoires() {
    return this.publicTutorialsService.getCategories();
  }

  @Get()
  findAll(@Query() queryParams: GetPortalTutorialsDto) {
    return this.publicTutorialsService.findPublicList(queryParams);
  }

  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.publicTutorialsService.findPublicBySlug(slug);
  }
}
