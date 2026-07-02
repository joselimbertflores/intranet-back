import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { GetAuthUser, ProtectedResource } from 'src/modules/auth/decorators';
import { Resource, User } from 'src/modules/users/entities';

import {
  CreateLandingModalNoticeDto,
  SaveFeaturedBannersBatchDto,
  SaveHeroSlidesBatchDto,
  SaveQuickAccessesBatchDto,
  UpdateLandingModalNoticeDto,
} from '../dtos';
import {
  LandingModalNoticesService,
  FeaturedBannersService,
  HeroSlidesService,
  QuickAccessesService,
} from '../services';
import { PaginationParamsDto } from 'src/modules/common';

@ProtectedResource(Resource.CONTENT)
@Controller('content')
export class ContentAdminController {
  constructor(
    private readonly heroSlidesService: HeroSlidesService,
    private readonly quickAccessesService: QuickAccessesService,
    private readonly featuredBannersService: FeaturedBannersService,
    private readonly landingModalNoticesService: LandingModalNoticesService,
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

  @Get('landing-modal-notices')
  getLandingModalNotices(@Query() queryParams: PaginationParamsDto) {
    return this.landingModalNoticesService.findAll(queryParams);
  }

  @Post('landing-modal-notices')
  createLandingModalNotice(@Body() dto: CreateLandingModalNoticeDto, @GetAuthUser() user: User) {
    return this.landingModalNoticesService.create(dto, user);
  }

  @Patch('landing-modal-notices/:id')
  updateLandingModalNotice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLandingModalNoticeDto,
    @GetAuthUser() user: User,
  ) {
    return this.landingModalNoticesService.update(id, dto, user);
  }

  @Delete('landing-modal-notices/:id')
  removeLandingModalNotice(@Param('id', ParseUUIDPipe) id: string) {
    return this.landingModalNoticesService.remove(id);
  }
}
