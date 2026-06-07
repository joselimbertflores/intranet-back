import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { ProtectedResource } from 'src/modules/auth/decorators';
import { CreateRoleDto, UpdateRoleDto } from '../dtos';
import { PaginationParamsDto } from 'src/modules/common';
import { RoleService, SecurityBootstrapService } from '../services';
import { Resource } from '../entities';

@ProtectedResource(Resource.USERS)
@Controller('roles')
export class RoleController {
  constructor(
    private roleService: RoleService,
    private securityBootstrapService: SecurityBootstrapService,
  ) {}

  @Get('permissions')
  getPermissions() {
    return this.roleService.getGroupedPermissions();
  }

  // @Public()
  @Get('seed/permissions')
  seedPermissions() {
    return this.securityBootstrapService.seedPermissions();
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
