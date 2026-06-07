import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoleController, UsersController } from './controllers';
import { IdentityHubUsersClientService, RoleService, SecurityBootstrapService, UsersService } from './services';
import { Permission, Role, User } from './entities';

@Module({
  controllers: [UsersController, RoleController],
  providers: [UsersService, RoleService, SecurityBootstrapService, IdentityHubUsersClientService],
  imports: [HttpModule, TypeOrmModule.forFeature([User, Role, Permission])],
  exports: [TypeOrmModule, UsersService, RoleService, SecurityBootstrapService],
})
export class UsersModule {}
