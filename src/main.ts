import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { EnvironmentVariables } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvironmentVariables>);

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'auth/login', method: RequestMethod.GET },
      { path: 'auth/callback', method: RequestMethod.GET },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigin = configService.get<string>('CORS_ORIGIN');

  if (corsOrigin) {
    console.log(`Enabling CORS for origin: ${corsOrigin}`);
    app.enableCors({ origin: corsOrigin, credentials: true });
  }

  app.use(cookieParser());
  await app.listen(configService.get<number>('PORT') || 3000  );
}
void bootstrap();
