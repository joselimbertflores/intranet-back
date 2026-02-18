import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TutorialCategoryService, TutorialService } from '../services';
import { CreateTutorialDto, UpdateTutorialDto } from '../dtos';
import { PaginationParamsDto } from 'src/modules/common';

@Controller('tutorials')
export class TutorialController {
  constructor(
    private tutorialService: TutorialService,
    private tutorialCategory: TutorialCategoryService,
  ) {}

  @Get('categories')
  getCategories() {
    return this.tutorialCategory.findAll();
  }

  @Post()
  create(@Body() createTutorialDto: CreateTutorialDto) {
    return this.tutorialService.create(createTutorialDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTutorialDto: UpdateTutorialDto) {
    return this.tutorialService.update(id, updateTutorialDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tutorialService.findOne(id);
  }

  @Get()
  findAll(@Param() queryParams: PaginationParamsDto) {
    return this.tutorialService.findAll(queryParams);
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.tutorialService.remove(+id);
  // }
}
