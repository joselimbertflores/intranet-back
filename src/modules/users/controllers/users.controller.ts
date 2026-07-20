import { Controller, Get, Body, Patch, Param, Query, Post } from '@nestjs/common';
import { PaginationParamsDto } from 'src/modules/common';

import { ProtectedResource } from 'src/modules/auth/decorators';
import { IdentityUserProvisioningService, RolesService, UsersService } from '../services';
import { ImportUserFromIdentityDto, SearchIdentityCandidatesDto, UpdateUserDto } from '../dtos';
import { Resource } from '../entities';
@ProtectedResource(Resource.USERS)
@Controller('users')
export class UsersController {
  constructor(
    private readonly roleService: RolesService,
    private readonly userService: UsersService,
    private readonly identityUserProvisioningService: IdentityUserProvisioningService,
  ) {}

  @Get('roles')
  getRoles() {
    return this.roleService.getRolesToUser();
  }

  @Get()
  findAll(@Query() queryParams: PaginationParamsDto) {
    return this.userService.findAll(queryParams);
  }

  @Get('identity-candidates')
  searchIdentityCandidates(@Query() queryParams: SearchIdentityCandidatesDto) {
    return this.identityUserProvisioningService.searchIdentityCandidates(queryParams.term);
  }

  @Get('identity-candidates/:externalKey')
  findIdentityCandidateByExternalKey(@Param('externalKey') externalKey: string) {
    return this.identityUserProvisioningService.findIdentityCandidateByExternalKey(externalKey);
  }

  @Post('import-from-identity')
  importFromIdentity(@Body() body: ImportUserFromIdentityDto) {
    return this.identityUserProvisioningService.importFromIdentity(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() userDto: UpdateUserDto) {
    return this.userService.update(id, userDto);
  }
}
