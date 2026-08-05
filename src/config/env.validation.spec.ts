import { EnvironmentVariables, environmentValidationSchema } from './env.validation';

const validEnvironment = {
  NODE_ENV: 'development',
  PORT: '3000',
  INTRANET_PUBLIC_URL: 'http://localhost:3000',
  INTRANET_UI_URL: 'http://localhost:4200',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'intranet',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'postgres',
  DATABASE_SYNCHRONIZE: 'true',
  IDENTITY_HUB_PUBLIC_URL: 'http://localhost:8000',
  OAUTH_CLIENT_ID: 'intranet',
  OAUTH_CLIENT_SECRET: 'test-secret',
  AUTH_COOKIE_SECURE: 'false',
  AUTH_COOKIE_SAME_SITE: 'lax',
  UPLOAD_PATH: 'storage/uploads',
};

describe('environmentValidationSchema', () => {
  it('accepts absolute HTTP URLs and converts numbers and booleans', () => {
    const result = environmentValidationSchema.validate(validEnvironment, {
      abortEarly: false,
      allowUnknown: true,
    });
    const value = result.value as EnvironmentVariables;

    expect(result.error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.DATABASE_PORT).toBe(5432);
    expect(value.DATABASE_SYNCHRONIZE).toBe(true);
    expect(value.AUTH_COOKIE_SECURE).toBe(false);
  });

  it('rejects relative or non-HTTP public URLs', () => {
    const { error } = environmentValidationSchema.validate({
      ...validEnvironment,
      INTRANET_PUBLIC_URL: '/intranet',
      IDENTITY_HUB_PUBLIC_URL: 'ftp://identity.example.org',
    }, { abortEarly: false });

    expect(error?.details.map((detail) => detail.path.join('.'))).toEqual(
      expect.arrayContaining(['INTRANET_PUBLIC_URL', 'IDENTITY_HUB_PUBLIC_URL']),
    );
  });

  it('rejects schema synchronization in production and SameSite none without secure cookies', () => {
    const { error } = environmentValidationSchema.validate(
      {
        ...validEnvironment,
        NODE_ENV: 'production',
        DATABASE_SYNCHRONIZE: 'true',
        AUTH_COOKIE_SAME_SITE: 'none',
      },
      { abortEarly: false },
    );

    expect(error?.details.map((detail) => detail.path.join('.'))).toEqual(
      expect.arrayContaining(['DATABASE_SYNCHRONIZE', 'AUTH_COOKIE_SAME_SITE']),
    );
  });
});
