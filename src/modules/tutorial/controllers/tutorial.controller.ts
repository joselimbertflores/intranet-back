import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { PaginationParamsDto } from 'src/common/dtos';
import { ProtectedResource } from 'src/modules/auth/decorators';
import { Resource } from 'src/modules/users/entities';

import {
  CreateTutorialBlockDto,
  CreateTutorialDto,
  ReorderTutorialBlocksDto,
  UpdateTutorialBlockDto,
  UpdateTutorialDto,
} from '../dtos';
import { TutorialBlockService, TutorialCategoryService, TutorialService } from '../services';

@ProtectedResource(Resource.TUTORIALS)
@Controller('tutorials')
export class TutorialController {
  constructor(
    private readonly tutorialService: TutorialService,
    private readonly tutorialCategoryService: TutorialCategoryService,
    private readonly tutorialBlockService: TutorialBlockService,
  ) {}

  @Get('categories')
  getCategories() {
    return this.tutorialCategoryService.findAll();
  }

  @Post()
  create(@Body() dto: CreateTutorialDto) {
    return this.tutorialService.create(dto);
  }

  @Post(':tutorialId/block')
  createBlock(@Param('tutorialId', ParseUUIDPipe) tutorialId: string, @Body() dto: CreateTutorialBlockDto) {
    return this.tutorialBlockService.create(tutorialId, dto);
  }

  @Patch('block/:id')
  updateBlock(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTutorialBlockDto) {
    return this.tutorialBlockService.update(id, dto);
  }

  @Put(':id/blocks/order')
  updateBlockOrder(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReorderTutorialBlocksDto) {
    return this.tutorialBlockService.updateBlocksOrder(id, dto);
  }

  @Delete('block/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBlock(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tutorialBlockService.remove(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tutorialService.remove(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTutorialDto) {
    return this.tutorialService.update(id, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tutorialService.findOne(id);
  }

  @Get()
  findAll(@Query() queryParams: PaginationParamsDto) {
    return this.tutorialService.findAll(queryParams);
  }
}
