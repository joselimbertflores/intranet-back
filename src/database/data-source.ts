import 'dotenv/config';
import { join } from 'path';

import { DataSource } from 'typeorm';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for TypeORM migrations.`);
  }

  return value;
}

function getDatabasePort(): number {
  const value = Number(getRequiredEnv('DATABASE_PORT'));

  if (!Number.isInteger(value)) {
    throw new Error('DATABASE_PORT must be a valid integer.');
  }

  return value;
}

export default new DataSource({
  type: 'postgres',
  host: getRequiredEnv('DATABASE_HOST'),
  port: getDatabasePort(),
  database: getRequiredEnv('DATABASE_NAME'),
  username: getRequiredEnv('DATABASE_USER'),
  password: getRequiredEnv('DATABASE_PASSWORD'),
  synchronize: false,
  entities: [join(__dirname, '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
