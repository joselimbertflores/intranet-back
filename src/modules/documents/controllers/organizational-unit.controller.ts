import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';

import { OrganizationalUnitService } from '../services/organizational-unit.service';
import { CreateOrganizationalUnitDto, UpdateOrganizationalUnitDto } from '../dtos';
import { OrganizationalUnit } from '../entities/organizational-unit.entity';
import { ProtectedResource } from 'src/modules/auth/decorators';
import { Resource } from 'src/modules/users/entities';

@ProtectedResource(Resource.DOCUMENTS)
@Controller('organizational-units')
export class OrganizationalUnitController {
  constructor(private readonly organizationalUnitService: OrganizationalUnitService) {}

  @Get()
  getTree() {
    return this.organizationalUnitService.getTree();
  }

  @Post()
  create(@Body() createOrganizationalUnitDto: CreateOrganizationalUnitDto): Promise<OrganizationalUnit> {
    return this.organizationalUnitService.create(createOrganizationalUnitDto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateOrganizationalUnitDto: UpdateOrganizationalUnitDto) {
    return this.organizationalUnitService.update(id, updateOrganizationalUnitDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.organizationalUnitService.remove(id);
  }
}
