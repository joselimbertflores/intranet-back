import { Body, Controller, Get, Put } from '@nestjs/common';
import { HeroSlidesService } from '../services';
import { ReplaceHeroSlideDto } from '../dtos';

@Controller('hero-slide')
export class HeroSlideController {
  constructor(private readonly heroSlideService: HeroSlidesService) {}

  @Put()
  replaceSlides(@Body() heroSlideDto: ReplaceHeroSlideDto) {
    return this.heroSlideService.replaceSlides(heroSlideDto);
  }

  @Get()
  findAll() {
    return this.heroSlideService.findAll();
  }
}
