import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put } from '@nestjs/common';

import { ProtectedResource } from 'src/modules/auth/decorators';
import { Resource } from 'src/modules/users/entities';

import { SaveHeroSlidesBatchDto, SaveQuickAccessesBatchDto } from '../dtos';
import { HeroSlidesService, QuickAccessesService } from '../services';

@ProtectedResource(Resource.CONTENT)
@Controller('content/admin')
export class ContentAdminController {
  constructor(
    private readonly heroSlidesService: HeroSlidesService,
    private readonly quickAccessesService: QuickAccessesService,
  ) {}

  @Get('hero-slides')
  getHeroSlides() {
    return this.heroSlidesService.findAll();
  }

  @Put('hero-slides/batch')
  saveHeroSlidesBatch(@Body() dto: SaveHeroSlidesBatchDto) {
    return this.heroSlidesService.saveBatch(dto);
  }

  @Delete('hero-slides/:id')
  removeHeroSlide(@Param('id', ParseIntPipe) id: number) {
    return this.heroSlidesService.remove(id);
  }

  @Get('quick-accesses')
  getQuickAccesses() {
    return this.quickAccessesService.findAdmin();
  }

  @Put('quick-accesses/batch')
  saveQuickAccessesBatch(@Body() dto: SaveQuickAccessesBatchDto) {
    return this.quickAccessesService.saveBatch(dto);
  }

  @Delete('quick-accesses/:id')
  removeQuickAccess(@Param('id', ParseIntPipe) id: number) {
    return this.quickAccessesService.remove(id);
  }
}
