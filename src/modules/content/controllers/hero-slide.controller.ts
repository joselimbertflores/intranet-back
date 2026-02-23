import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { BannerService } from '../services';
import { ReplaceBannersDto } from '../dtos';

@Controller('banner')
export class HeroSlideController {
  constructor(private readonly heroSlideService: BannerService) {}

  @Put()
  replaceSlides(@Body() dto: ReplaceBannersDto) {
    return this.heroSlideService.replaceAll(dto);
  }

  @Get()
  findAll() {
    return this.heroSlideService.findAll();
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.heroSlideService.remove(+id);
  }
}
