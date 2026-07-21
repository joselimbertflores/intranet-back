import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { ProtectedResource } from 'src/modules/auth/decorators';
import { PaginationParamsDto } from 'src/common/dtos';

import { CreateRoleDto, UpdateRoleDto } from '../dtos';
import { RolesService } from '../services';
import { Resource } from '../entities';

@ProtectedResource(Resource.ROLES)
@Controller('roles')
export class RolesController {
  constructor(private roleService: RolesService) {}

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
