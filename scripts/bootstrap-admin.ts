import 'dotenv/config';
import { INestApplicationContext, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { EnvironmentVariables } from 'src/config';
import { AccessControlBootstrapService } from 'src/modules/users/services';
import { AppModule } from 'src/app.module';

async function bootstrap() {
  let app: INestApplicationContext | undefined;

  try {
    app = await NestFactory.createApplicationContext(AppModule);
    const configService = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
    const externalKey = getBootstrapAdminExternalKey(configService);

    const accessControlBootstrapService = app.get(AccessControlBootstrapService);
    const result = await accessControlBootstrapService.bootstrapInitialAdmin(externalKey);

    console.log('Permisos y rol ADMIN sincronizados correctamente.');

    if (result.status === 'admin-already-exists') {
      console.log('Ya existe al menos un ADMIN local. No se creó ningún usuario.');
      return;
    }
    console.log('Primer ADMIN local creado correctamente.');
  } catch (error) {
    process.exitCode = 1;

    if (error instanceof NotFoundException) {
      console.error(
        'Identity Hub no encontro el usuario solicitado. El usuario no existe, esta inactivo o no tiene acceso a Intranet.',
      );
      return;
    }

    console.error(error instanceof Error ? error.message : error);
  } finally {
    await app?.close();
  }
}

function getBootstrapAdminExternalKey(configService: ConfigService<EnvironmentVariables, true>): string {
  const externalKey = configService.get('BOOTSTRAP_ADMIN_EXTERNAL_KEY', { infer: true });
  if (!externalKey) throw new Error('BOOTSTRAP_ADMIN_EXTERNAL_KEY is required to create the initial admin user.');
  return externalKey;
}

void bootstrap();
