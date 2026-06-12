import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesController, UsersController } from './controllers';
import { IdentityHubUsersClientService, RolesService, SecurityBootstrapService, UsersService } from './services';
import { Permission, Role, User } from './entities';

@Module({
  controllers: [UsersController, RolesController],
  providers: [UsersService, RolesService, SecurityBootstrapService, IdentityHubUsersClientService],
  imports: [HttpModule, TypeOrmModule.forFeature([User, Role, Permission])],
  exports: [TypeOrmModule, UsersService, RolesService, SecurityBootstrapService],
})
export class UsersModule {}
