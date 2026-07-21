import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { TutorialBlockService, TutorialCategoryService, TutorialService } from '../services';
import {
  CreateTutorialBlockDto,
  CreateTutorialDto,
  ReorderTutorialBlocksDto,
  UpdateTutorialBlockDto,
  UpdateTutorialDto,
} from '../dtos';
import { PaginationParamsDto } from 'src/common/dtos';
import { ProtectedResource } from 'src/modules/auth/decorators';
import { Resource } from 'src/modules/users/entities';

@ProtectedResource(Resource.TUTORIALS)
@Controller('tutorials')
export class TutorialController {
  constructor(
    private tutorialService: TutorialService,
    private tutorialCategory: TutorialCategoryService,
    private tutorialBlockService: TutorialBlockService,
  ) {}

  @Get('categories')
  getCategories() {
    return this.tutorialCategory.findAll();
  }

  @Post()
  create(@Body() createTutorialDto: CreateTutorialDto) {
    return this.tutorialService.create(createTutorialDto);
  }

  @Post('/:tutorialId/block')
  createBlock(@Param('tutorialId', ParseUUIDPipe) tutorialId: string, @Body() dto: CreateTutorialBlockDto) {
    return this.tutorialBlockService.create(tutorialId, dto);
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
  findAll(@Query() queryParams: PaginationParamsDto) {
    return this.tutorialService.findAll(queryParams);
  }

  @Patch('block/:id')
  updateBlock(@Param('id') id: string, @Body() body: UpdateTutorialBlockDto) {
    return this.tutorialBlockService.update(id, body);
  }

  @Put(':id/blocks/order')
  updateBlockOrder(@Param('id') id: string, @Body() dto: ReorderTutorialBlocksDto) {
    return this.tutorialBlockService.updateBlocksOrder(id, dto);
  }

  @Delete('block/:id')
  remove(@Param('id') id: string) {
    return this.tutorialBlockService.remove(id);
  }
}
