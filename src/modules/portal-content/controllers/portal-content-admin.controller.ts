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
  SaveFeaturedBannersBatchDto,
  CreateQuickAccessDto,
  ReorderQuickAccessesDto,
  UpdateQuickAccessDto,
  SaveHeroSlidesBatchDto,
  CreateLandingNoticeDto,
  UpdateLandingNoticeDto,
} from '../dtos';
import { LandingNoticesService, FeaturedBannersService, HeroSlidesService, QuickAccessesService } from '../services';
import { PaginationParamsDto } from 'src/common/dtos';

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

  @Post('quick-accesses')
  createQuickAccess(@Body() dto: CreateQuickAccessDto) {
    return this.quickAccessesService.create(dto);
  }

  @Put('quick-accesses/reorder')
  reorderQuickAccesses(@Body() dto: ReorderQuickAccessesDto) {
    return this.quickAccessesService.reorder(dto);
  }

  @Patch('quick-accesses/:id')
  updateQuickAccess(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuickAccessDto) {
    return this.quickAccessesService.update(id, dto);
  }

  @Delete('quick-accesses/:id')
  removeQuickAccess(@Param('id', ParseIntPipe) id: number) {
    return this.quickAccessesService.remove(id);
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
  getLandingNotices(@Query() queryParams: PaginationParamsDto) {
    return this.landingNoticesService.findAll(queryParams);
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
