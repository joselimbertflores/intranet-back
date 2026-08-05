# Intranet institucional — backend

API NestJS de la Intranet. Publica contenido institucional y administra documentos, comunicados, calendario, directorio y tutoriales. La identidad proviene de Identity Hub; los usuarios, roles, permisos y sesiones de la Intranet permanecen locales.

## Desarrollo local

Requisitos: Node.js, npm y PostgreSQL.

```bash
npm install
Copy-Item .env.template .env
npm run start:dev
```

Configura el cliente `intranet` y su callback exacto en Identity Hub antes de probar el login. El callback se deriva de `INTRANET_PUBLIC_URL` como `/auth/callback`. `.env.template` es la referencia completa de configuración; no se debe versionar `.env`.

HTTP funciona en desarrollo y redes internas. Para un despliegue publicado se recomienda HTTPS y `AUTH_COOKIE_SECURE=true`.

## Base de datos

`DATABASE_SYNCHRONIZE=true` se admite solo para desarrollo local. En producción debe ser `false` y los cambios de esquema deben aplicarse mediante migraciones.

```bash
npm run migration:generate -- src/database/migrations/NombreDeMigracion
npm run migration:run
npm run migration:revert
```

## Primer administrador local

El comando sincroniza permisos, asegura el rol local `ADMIN` y crea el primer administrador solo si todavía no existe uno. El usuario debe estar activo y asignado a la Intranet en Identity Hub.

```bash
$env:BOOTSTRAP_ADMIN_EXTERNAL_KEY='IDH-U-...'
npm run bootstrap:admin
```

El bootstrap no crea usuarios ni aplicaciones en Identity Hub y no promueve silenciosamente un usuario local existente.

## Verificación

```bash
npm test
npm run build
npm run lint
```

La documentación técnica está en [docs/README.md](docs/README.md).
