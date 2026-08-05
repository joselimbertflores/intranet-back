import 'dotenv/config';
import { join } from 'path';

import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { EnvironmentVariables } from '../config';

const configService = new ConfigService<EnvironmentVariables, true>();
const databasePort = Number(configService.getOrThrow('DATABASE_PORT', { infer: true }));

if (!Number.isInteger(databasePort)) {
  throw new Error('DATABASE_PORT must be a valid integer.');
}

export default new DataSource({
  type: 'postgres',
  host: configService.getOrThrow('DATABASE_HOST', { infer: true }),
  port: databasePort,
  database: configService.getOrThrow('DATABASE_NAME', { infer: true }),
  username: configService.getOrThrow('DATABASE_USER', { infer: true }),
  password: configService.getOrThrow('DATABASE_PASSWORD', { infer: true }),
  synchronize: false,
  entities: [join(__dirname, '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
