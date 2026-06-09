import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { ProtectedResource } from 'src/modules/auth/decorators';
import { PaginationParamsDto } from 'src/modules/common';

import { RoleService } from '../services';
import { CreateRoleDto, UpdateRoleDto } from '../dtos';
import { Resource } from '../entities';

@ProtectedResource(Resource.ROLES)
@Controller('roles')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Get('permissions')
  getGroupedPermissions() {
    return this.roleService.getGroupedPermissions();
  }

  @Post()
  create(@Body() body: CreateRoleDto) {
    return this.roleService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateRoleDto) {
    return this.roleService.update(id, body);
  }

  @Get()
  findAll(@Query() queryParams: PaginationParamsDto) {
    return this.roleService.findAll(queryParams);
  }
}
