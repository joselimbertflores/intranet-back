import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { PaginationDto } from 'src/modules/common';

import { CreateUserDto, UpdateUserDto } from '../dtos';
import { RoleService, UsersService } from '../services';

@Controller('users')
export class UsersController {
  constructor(
    private readonly userService: UsersService,
    private readonly roleService: RoleService,
  ) {}

  @Get('roles')
  getRoles() {
    return this.roleService.getRolesToUser();
  }

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
