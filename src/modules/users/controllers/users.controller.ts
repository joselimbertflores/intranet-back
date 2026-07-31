import { Controller, Get, Body, Patch, Param, Query, Post } from '@nestjs/common';
import { PaginationParamsDto } from 'src/common/dtos';

import { ProtectedResource } from 'src/modules/auth/decorators';
import { IdentityUserProvisioningService, RolesService, UsersService } from '../services';
import {
  IdentityExternalKeyParamDto,
  ImportUserFromIdentityDto,
  SearchIdentityCandidatesDto,
  UpdateUserDto,
  UserIdParamDto,
} from '../dtos';
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
    return this.roleService.findRoleOptions();
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
  findIdentityCandidateByExternalKey(@Param() { externalKey }: IdentityExternalKeyParamDto) {
    return this.identityUserProvisioningService.findIdentityCandidateByExternalKey(externalKey);
  }

  @Post('import-from-identity')
  importFromIdentity(@Body() body: ImportUserFromIdentityDto) {
    return this.identityUserProvisioningService.importFromIdentity(body);
  }

  @Patch(':id')
  update(@Param() { id }: UserIdParamDto, @Body() userDto: UpdateUserDto) {
    return this.userService.update(id, userDto);
  }
}
