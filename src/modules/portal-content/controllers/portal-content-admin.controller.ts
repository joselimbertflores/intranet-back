import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';

import { GetAuthUser, ProtectedResource } from 'src/modules/auth/decorators';
import { Resource, User } from 'src/modules/users/entities';

import {
  CreateLandingNoticeDto,
  SaveFeaturedBannersBatchDto,
  SaveHeroSlidesBatchDto,
  SaveQuickAccessesBatchDto,
  UpdateLandingNoticeDto,
} from '../dtos';
import { LandingNoticesService, FeaturedBannersService, HeroSlidesService, QuickAccessesService } from '../services';

@ProtectedResource(Resource.CONTENT)
@Controller('content')
export class PortalContentAdminController {
  constructor(
    private readonly heroSlidesService: HeroSlidesService,
    private readonly quickAccessesService: QuickAccessesService,
    private readonly featuredBannersService: FeaturedBannersService,
    private readonly landingNoticesService: LandingNoticesService,
  ) {}

  @Get('hero-slides')
  getHeroSlides() {
    return this.heroSlidesService.findAll();
  }

  @Post('hero-slides/batch')
  saveHeroSlidesBatch(@Body() dto: SaveHeroSlidesBatchDto) {
    return this.heroSlidesService.saveBatch(dto);
  }

  @Get('quick-accesses')
  getQuickAccesses() {
    return this.quickAccessesService.findAll();
  }

  @Put('quick-accesses/batch')
  saveQuickAccessesBatch(@Body() dto: SaveQuickAccessesBatchDto) {
    return this.quickAccessesService.saveBatch(dto);
  }

  @Get('featured-banners')
  getFeaturedBanners() {
    return this.featuredBannersService.findAll();
  }

  @Put('featured-banners/batch')
  saveFeaturedBannersBatch(@Body() dto: SaveFeaturedBannersBatchDto) {
    return this.featuredBannersService.saveBatch(dto);
  }

  @Get('landing-notices')
  getLandingNotices() {
    return this.landingNoticesService.findAll();
  }

  @Post('landing-notices')
  createLandingNotice(@Body() dto: CreateLandingNoticeDto, @GetAuthUser() user: User) {
    return this.landingNoticesService.create(dto, user);
  }

  @Patch('landing-notices/:id')
  updateLandingNotice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLandingNoticeDto,
    @GetAuthUser() user: User,
  ) {
    return this.landingNoticesService.update(id, dto, user);
  }

  @Delete('landing-notices/:id')
  removeLandingNotice(@Param('id', ParseUUIDPipe) id: string) {
    return this.landingNoticesService.remove(id);
  }
}
