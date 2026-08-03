import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsNumber()
  PORT: number;

  @IsString()
  APP_PUBLIC_URL: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  DATABASE_PORT: number;

  @IsString()
  DATABASE_NAME: string;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsIn(['true', 'false'])
  DB_SYNCHRONIZE: 'true' | 'false';

  @IsString()
  IDENTITY_HUB_URL: string;

  @IsString()
  IDENTITY_HUB_INTERNAL_URL: string;

  @IsOptional()
  @IsString()
  IDENTITY_HUB_JWKS_URL?: string;

  @IsString()
  @IsNotEmpty()
  OAUTH_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  OAUTH_CLIENT_SECRET: string;

  @IsString()
  OAUTH_REDIRECT_URI: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  INTRANET_UI_BASE_URL?: string;

  @IsString()
  @IsNotEmpty()
  OAUTH_ISSUER: string;

  @Transform(({ obj, key }) => {
    const rawValue = obj[key];

    if (rawValue === true || rawValue === 'true') {
      return true;
    }

    if (rawValue === false || rawValue === 'false') {
      return false;
    }

    return rawValue;
  })
  @IsBoolean()
  AUTH_COOKIE_SECURE: boolean;

  @IsOptional()
  @IsIn(['lax', 'strict', 'none'])
  AUTH_COOKIE_SAME_SITE?: 'lax' | 'strict' | 'none';

  @IsOptional()
  @IsString()
  BOOTSTRAP_ADMIN_EXTERNAL_KEY?: string;

  @IsString()
  UPLOAD_PATH: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
