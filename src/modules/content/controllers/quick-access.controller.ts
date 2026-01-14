import { Body, Controller, Get, Put } from '@nestjs/common';
import { QuickAccessService } from '../services';
import { ReplaceQuickAccessDto } from '../dtos';

@Controller('quick-access')
export class QuickAccessController {
  constructor(private quickAccesService: QuickAccessService) {}

  @Put()
  replaceItems(@Body() heroSlideDto: ReplaceQuickAccessDto) {
    return this.quickAccesService.replaceItems(heroSlideDto);
  }

  @Get()
  findAll() {
    return this.quickAccesService.findAll();
  }
}
