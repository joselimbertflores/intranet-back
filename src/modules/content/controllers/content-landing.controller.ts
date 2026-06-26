import { Controller, Get } from '@nestjs/common';

import { Public } from 'src/modules/auth/decorators';

import { HeroSlidesService, QuickAccessesService } from '../services';

@Public()
@Controller('content')
export class ContentLandingController {
  constructor(
    private readonly heroSlidesService: HeroSlidesService,
    private readonly quickAccessesService: QuickAccessesService,
  ) {}

  @Get('landing')
  async getLanding() {
    const [heroSlides, quickAccesses] = await Promise.all([
      this.heroSlidesService.findLanding(),
      this.quickAccessesService.findLanding(),
    ]);

    return { heroSlides, quickAccesses };
  }
}
