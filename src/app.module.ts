import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { join } from 'path';

import { CommunicationsModule } from './modules/communications/communications.module';
import { EnvironmentVariables, validate } from './config/env.validation';
import { DirectoryModule } from './modules/directory/directory.module';
import { DocumentModule } from './modules/documents/document.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { TutorialModule } from './modules/tutorial/tutorial.module';
import { ContentModule } from './modules/content/content.module';
import { PortalModule } from './modules/portal/portal.module';
import { UsersModule } from './modules/users/users.module';
import { FilesModule } from './modules/files/files.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ validate, isGlobal: true }),
    CacheModule.register({ ttl: 0, isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        return {
          type: 'postgres',
          host: configService.get('DATABASE_HOST'),
          port: +configService.get('DATABASE_PORT'),
          database: configService.get('DATABASE_NAME'),
          username: configService.get('DATABASE_USER'),
          password: configService.get('DATABASE_PASSWORD'),
          autoLoadEntities: true,
          synchronize: !isProduction,
        };
      },
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public', 'browser'),
      exclude: ['/api/{*path}', '/auth/login', '/auth/callback'],
    }),
    CommunicationsModule,
    DocumentModule,
    ContentModule,
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
