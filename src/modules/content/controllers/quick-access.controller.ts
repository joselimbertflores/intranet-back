import { Body, Controller, Get, Put } from '@nestjs/common';
import { QuickAccessItemService } from '../services';
import { ReplaceQuickAccessDto } from '../dtos';

@Controller('quick-access')
export class QuickAccessController {
  constructor(private quickAccesService: QuickAccessItemService) {}

  @Put()
  replaceAll(@Body() heroSlideDto: ReplaceQuickAccessDto) {
    return this.quickAccesService.replaceAll(heroSlideDto);
  }

  @Get()
  findAll() {
    return this.quickAccesService.findAll();
  }
}
