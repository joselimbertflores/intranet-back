import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { EnvironmentVariables } from 'src/config';
import { UsersModule } from '../users/users.module';
import { IdentityService } from './services/identity.service';
import { AuthGuard } from './guards/auth/auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    IdentityService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  imports: [
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService<EnvironmentVariables>) => ({
        publicKey: config.getOrThrow('JWT_PUBLIC_KEY'),
        verifyOptions: {
          algorithms: ['RS256'],
          issuer: 'identity-hub',
          audience: 'sso-clients',
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
})
export class AuthModule {}
