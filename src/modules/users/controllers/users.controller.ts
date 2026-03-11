import { Controller, Get, Body, Patch, Param, Query } from '@nestjs/common';
import { PaginationParamsDto } from 'src/modules/common';

import { ProtectedResource } from 'src/modules/auth/decorators';
import { RoleService, UsersService } from '../services';
import { UpdateUserDto } from '../dtos';
import { Resource } from '../entities';
@ProtectedResource(Resource.USERS)
@Controller('users')
export class UsersController {
  constructor(
    private readonly roleService: RoleService,
    private readonly userService: UsersService,
  ) {}

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
