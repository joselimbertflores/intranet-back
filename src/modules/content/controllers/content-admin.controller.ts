import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put } from '@nestjs/common';

import { ProtectedResource } from 'src/modules/auth/decorators';
import { Resource } from 'src/modules/users/entities';

import { SaveFeaturedBannersBatchDto, SaveHeroSlidesBatchDto, SaveQuickAccessesBatchDto } from '../dtos';
import { FeaturedBannersService, HeroSlidesService, QuickAccessesService } from '../services';

@ProtectedResource(Resource.CONTENT)
@Controller('content')
export class ContentAdminController {
  constructor(
    private readonly heroSlidesService: HeroSlidesService,
    private readonly quickAccessesService: QuickAccessesService,
    private readonly featuredBannersService: FeaturedBannersService,
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
    return this.quickAccessesService.findAll();
  }

  @Put('quick-accesses/batch')
  saveQuickAccessesBatch(@Body() dto: SaveQuickAccessesBatchDto) {
    return this.quickAccessesService.saveBatch(dto);
  }

  @Delete('quick-accesses/:id')
  removeQuickAccess(@Param('id', ParseIntPipe) id: number) {
    return this.quickAccessesService.remove(id);
  }

  @Get('featured-banners')
  getFeaturedBanners() {
    return this.featuredBannersService.findAdminFeaturedBanners();
  }

  @Put('featured-banners/batch')
  saveFeaturedBannersBatch(@Body() dto: SaveFeaturedBannersBatchDto) {
    return this.featuredBannersService.saveFeaturedBannersBatch(dto);
  }

  @Delete('featured-banners/:id')
  removeFeaturedBanner(@Param('id', ParseIntPipe) id: number) {
    return this.featuredBannersService.removeFeaturedBanner(id);
  }
}
