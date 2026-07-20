import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesController, UsersController } from './controllers';
import {
  AccessControlBootstrapService,
  IdentityHubUsersClientService,
  IdentityUserProvisioningService,
  RolesService,
  UsersService,
} from './services';
import { Permission, Role, User } from './entities';

@Module({
  controllers: [UsersController, RolesController],
  providers: [
    UsersService,
    RolesService,
    IdentityHubUsersClientService,
    IdentityUserProvisioningService,
    AccessControlBootstrapService,
  ],
  imports: [HttpModule, TypeOrmModule.forFeature([User, Role, Permission])],
  exports: [TypeOrmModule, UsersService, RolesService, IdentityUserProvisioningService, AccessControlBootstrapService],
})
export class UsersModule {}
