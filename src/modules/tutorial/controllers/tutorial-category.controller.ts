import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { CreateTutorialCategoryDto, UpdateTutorialCategoryDto } from '../dtos';
import { ProtectedResource } from 'src/modules/auth/decorators';
import { Resource } from 'src/modules/users/entities';
import { TutorialCategoryService } from '../services';
@ProtectedResource(Resource.TUTORIALS)
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
