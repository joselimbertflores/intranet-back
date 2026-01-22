import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { PaginationParamsDto } from 'src/modules/common';

import { CreateUserDto, UpdateUserDto } from '../dtos';
import { RoleService, UsersService } from '../services';

@Controller('users')
export class UsersController {
  constructor(
    private readonly userService: UsersService,
    private readonly roleService: RoleService,
  ) {}

  @Get('seed/permissions')
  executePermissionsSeed() {
    return this.userService.executePermissionsSeed();
  }

  @Get('roles')
  getRoles() {
    return this.roleService.getRolesToUser();
  }

  @Get()
  findAll(@Query() queryParams: PaginationParamsDto) {
    return this.userService.findAll(queryParams);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() userDto: UpdateUserDto) {
    return this.userService.update(id, userDto);
  }
}
