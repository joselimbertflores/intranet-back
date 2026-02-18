import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { TutorialBlockService, TutorialCategoryService, TutorialService } from '../services';
import {
  CreateTutorialBlockDto,
  CreateTutorialDto,
  ReorderTutorialBlocksDto,
  UpdateTutorialBlockDto,
  UpdateTutorialDto,
} from '../dtos';
import { PaginationParamsDto } from 'src/modules/common';

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

  @Post('/:id/block')
  createBlock(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTutorialBlockDto) {
    return this.tutorialBlockService.create(id, dto);
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

  @Patch('block/:id')
  updateBLock(@Param('id') id: string, @Body() body: UpdateTutorialBlockDto) {
    return this.tutorialBlockService.update(id, body);
  }

  @Put(':id/blocks/order')
  updateBlockOrder(@Param('id') id: string, @Body() dto: ReorderTutorialBlocksDto) {
    return this.tutorialBlockService.updateBlocksOrder(id, dto);
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.tutorialService.remove(+id);
  // }
}
