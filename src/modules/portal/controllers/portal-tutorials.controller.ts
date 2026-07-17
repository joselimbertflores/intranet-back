import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from 'src/modules/auth/decorators';
import { SearchPublicTutorialsDto } from 'src/modules/tutorial/dtos';
import { PublicTutorialsService } from 'src/modules/tutorial/services';

@Public()
@Controller('portal-tutorials')
export class PortalTutorialsController {
  constructor(private readonly publicTutorialsService: PublicTutorialsService) {}

  @Get('categories')
  getCategories() {
    return this.publicTutorialsService.getCategories();
  }

  @Get()
  findAll(@Query() queryParams: SearchPublicTutorialsDto) {
    return this.publicTutorialsService.findAll(queryParams);
  }

  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.publicTutorialsService.findBySlug(slug);
  }
}
