import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from 'src/modules/auth/decorators';
import { GetPortalTutorialsDto } from 'src/modules/tutorial/dtos';
import { TutorialReadService } from 'src/modules/tutorial/services';

@Public()
@Controller('portal-tutorials')
export class PortalAssistanceController {
  constructor(private tutorialReadService: TutorialReadService) {}

  @Get('categories')
  getCategoires() {
    return this.tutorialReadService.getCategories();
  }

  @Get()
  findAll(@Query() queryParams: GetPortalTutorialsDto) {
    return this.tutorialReadService.findPublicList(queryParams);
  }

  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.tutorialReadService.findPublicBySlug(slug);
  }
}
