import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { PaginationDto } from 'src/modules/common';
import { CreateUserDto, UpdateUserDto } from '../dtos';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get()
  findAll(@Query() queryParams: PaginationDto) {
    return this.userService.findAll(queryParams);
  }

  @Get('seed/permissions')
  executePermissionsSeed() {
    return this.userService.executePermissionsSeed();
  }

  @Post()
  create(@Body() userDto: CreateUserDto) {
    return this.userService.create(userDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() userDto: UpdateUserDto) {
    return this.userService.update(id, userDto);
  }
}
