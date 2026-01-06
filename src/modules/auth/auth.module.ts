import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/config';
import { UsersModule } from '../users/users.module';
import { IdentityService } from './services/identity.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, IdentityService],
  imports: [
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService<EnvironmentVariables>) => ({
        secret: config.getOrThrow('JWT_PUBLIC_KEY'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
})
export class AuthModule {}
