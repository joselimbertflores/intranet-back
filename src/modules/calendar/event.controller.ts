import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto, UpdateEventDto } from './dtos/event.dto';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  // 🔧 --- Administración ---
  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.eventService.create(dto);
  }

  @Get('admin')
  findAllAdmin() {
    return this.eventService.findAllAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventService.remove(+id);
  }

  // 🌐 --- Consulta pública (para el calendario) ---
  @Get()
  findByRange(@Query('start') start?: string, @Query('end') end?: string) {
    return this.eventService.findByRange(start, end);
  }
}
