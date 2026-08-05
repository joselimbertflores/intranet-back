import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { join } from 'path';

import { CommunicationsModule } from './modules/communications/communications.module';
import { EnvironmentVariables, environmentValidationSchema } from './config';
import { DirectoryModule } from './modules/directory/directory.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { TutorialModule } from './modules/tutorial/tutorial.module';
import { PortalContentModule } from './modules/portal-content/portal-content.module';
import { PortalModule } from './modules/portal/portal.module';
import { UsersModule } from './modules/users/users.module';
import { FilesModule } from './modules/files/files.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: environmentValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
      isGlobal: true,
      cache: true,
    }),
    CacheModule.register({ ttl: 0, isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) => ({
        type: 'postgres',
        host: configService.getOrThrow('DATABASE_HOST', { infer: true }),
        port: configService.getOrThrow('DATABASE_PORT', { infer: true }),
        database: configService.getOrThrow('DATABASE_NAME', { infer: true }),
        username: configService.getOrThrow('DATABASE_USER', { infer: true }),
        password: configService.getOrThrow('DATABASE_PASSWORD', { infer: true }),
        autoLoadEntities: true,
        synchronize: configService.getOrThrow('DATABASE_SYNCHRONIZE', { infer: true }),
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public', 'browser'),
      exclude: ['/api/{*path}', '/auth/login', '/auth/callback'],
    }),
    CommunicationsModule,
    DocumentsModule,
    PortalContentModule,
    CalendarModule,
    FilesModule,
    PortalModule,
    TutorialModule,
    AuthModule,
    UsersModule,
    DirectoryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
