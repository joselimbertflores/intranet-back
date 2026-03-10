import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CreateRoleDto, UpdateRoleDto } from '../dtos';
import { PaginationParamsDto } from 'src/modules/common';
import { RoleService } from '../services';

@Controller('roles')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Get('permissions')
  getPermissions() {
    const result = this.roleService.getGroupedPermissions();
    console.log(result);
    return result;
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
