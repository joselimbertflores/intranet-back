import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommunicationsModule } from './modules/communications/communications.module';
import { EnvironmentVariables, validate } from './config/env.validation';
import { DocumentModule } from './modules/documents/document.module';
import { ContentModule } from './modules/content/content.module';
import { EventModule } from './modules/calendar/calendar.module';
import { PortalModule } from './modules/portal/portal.module';
import { FilesModule } from './modules/files/files.module';
import { AssistanceModule } from './modules/learning/learning.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true,
    }),
    CacheModule.register({
      ttl: 0,
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: +configService.get('DATABASE_PORT'),
        database: configService.get('DATABASE_NAME'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    FilesModule,
    ContentModule,
    DocumentModule,
    PortalModule,
    CommunicationsModule,
    EventModule,
    AssistanceModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
