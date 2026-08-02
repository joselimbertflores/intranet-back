import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';

import { CreateTutorialCategoryDto, UpdateTutorialCategoryDto } from '../dtos';
import { ProtectedResource } from 'src/modules/auth/decorators';
import { Resource } from 'src/modules/users/entities';
import { TutorialCategoryService } from '../services';
@ProtectedResource(Resource.TUTORIALS)
@Controller('tutorial-categories')
export class TutorialCategoryController {
  constructor(private readonly tutorialCategoryService: TutorialCategoryService) {}

  @Post()
  create(@Body() dto: CreateTutorialCategoryDto) {
    return this.tutorialCategoryService.create(dto);
  }

  @Get()
  findAll() {
    return this.tutorialCategoryService.findAll();
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTutorialCategoryDto) {
    return this.tutorialCategoryService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tutorialCategoryService.remove(id);
  }
}
