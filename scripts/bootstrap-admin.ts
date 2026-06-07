import 'dotenv/config';
import { INestApplicationContext, NotFoundException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from 'src/app.module';
import { SecurityBootstrapService } from 'src/modules/users/services';

async function bootstrap() {
  let app: INestApplicationContext | undefined;

  try {
    const externalKey = getBootstrapAdminExternalKey();
    app = await NestFactory.createApplicationContext(AppModule);

    const securityBootstrapService = app.get(SecurityBootstrapService);

    const result = await securityBootstrapService.bootstrapInitialAdmin(externalKey);

    console.log('Permisos base sembrados correctamente.');
    console.log('Rol ADMIN asegurado con todos los permisos existentes.');

    if (result.status === 'admin-already-exists') {
      console.log('Ya existe al menos un ADMIN local. No se creo ningun usuario.');
      return;
    }

    console.log(`ADMIN local creado correctamente para ${result.user.externalKey}.`);
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

function getBootstrapAdminExternalKey(): string {
  const externalKey = process.env.BOOTSTRAP_ADMIN_EXTERNAL_KEY?.trim();
  if (!externalKey) throw new Error('BOOTSTRAP_ADMIN_EXTERNAL_KEY is required to create the initial admin user.');
  return externalKey;
}

void bootstrap();
