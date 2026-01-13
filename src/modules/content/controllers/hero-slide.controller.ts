import { Body, Controller, Get, Put } from '@nestjs/common';
import { HeroSlidesService } from '../services';
import { CreateHeroSlideDto } from '../dtos';

@Controller('hero-slide')
export class HeroSlideController {
  constructor(private readonly heroSlideService: HeroSlidesService) {}

  @Put()
  syncSlides(@Body() heroSlideDto: CreateHeroSlideDto) {
    return this.heroSlideService.replaceSlides(heroSlideDto);
  }

  @Get()
  findAll() {
    return this.heroSlideService.findAll();
  }
}
