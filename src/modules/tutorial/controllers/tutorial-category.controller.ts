import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TutorialCategoryService } from '../services';
import { CreateTutorialCategoryDto, UpdateTutorialCategoryDto } from '../dtos';

@Controller('tutorial-categories')
export class TutorialCategoryController {
  constructor(private tutorialCategory: TutorialCategoryService) {}

  @Post()
  create(@Body() dto: CreateTutorialCategoryDto) {
    return this.tutorialCategory.create(dto);
  }

  @Get()
  findAll() {
    return this.tutorialCategory.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTutorialCategoryDto) {
    return this.tutorialCategory.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tutorialCategory.remove(+id);
  }
}
