# Sistema Intranet Institucional - Backend

API del sistema de Intranet Institucional.

## Descripcion

Este sistema permite gestionar documentacion institucional, comunicados internos, directorios y tutoriales, facilitando el acceso a la informacion dentro de la institucion.

## Funcionalidades principales

- Gestion de documentacion institucional.
- Publicacion de comunicados internos.
- Gestion de directorios institucionales.
- Registro y consulta de tutoriales.
- Organizacion y acceso a contenido institucional.

## Requisitos previos

- Node.js
- npm
- PostgreSQL

## Instalacion

```bash
npm install
```

## Configuracion

Renombra `.env.template` a `.env` en la raiz del proyecto y configura las variables de entorno necesarias.

### SSO con Identity Hub

La Intranet funciona como cliente OAuth de Identity Hub. Identity Hub autentica la identidad global y controla el acceso global a la aplicacion mediante `user.isActive` central, `application.isActive` y la relacion `user_applications`. La Intranet conserva usuarios shadow locales con `externalKey`, `fullName`, roles/permisos locales e historial interno; no tiene `isActive` local para usuarios.

Variables principales:

- `INTRANET_UI_BASE_URL`: URL base opcional del frontend. Si existe, login correcto redirige a `{INTRANET_UI_BASE_URL}/admin` y errores a `{INTRANET_UI_BASE_URL}/auth/error?error=...`. Si se omite, usa `/admin` y `/auth/error?error=...`.
- `DB_SYNCHRONIZE`: `true` o `false`. Usa `true` solo en desarrollo local; staging y produccion deben usar `false` y migraciones.
- `OAUTH_CLIENT_ID`: identificador del cliente OAuth registrado en Identity Hub.
- `OAUTH_CLIENT_SECRET`: secreto del cliente OAuth registrado en Identity Hub.
- `OAUTH_REDIRECT_URI`: callback local, por ejemplo `http://localhost:3000/auth/callback`.
- `OAUTH_ISSUER`: issuer esperado en el access token.
- `IDENTITY_HUB_URL`: URL publica/navegable de Identity Hub; se usa para redirigir el navegador a `/oauth/authorize` y como base JWKS si no se define `IDENTITY_HUB_JWKS_URL`.
- `IDENTITY_HUB_INTERNAL_URL`: URL server-to-server para `/internal/users/assignable`.
- `IDENTITY_HUB_JWKS_URL`: URL JWKS opcional. Si se omite, se usa `IDENTITY_HUB_URL/.well-known/jwks.json`.
- `CORS_ORIGIN`: origen permitido unico cuando el frontend corre en otro origen. Si se omite, CORS no se habilita.
- `AUTH_COOKIE_SECURE`: `true` en HTTPS.
- `AUTH_COOKIE_SAME_SITE`: opcional, `lax`, `strict` o `none`. Por defecto es `lax`.
- `BOOTSTRAP_ADMIN_EXTERNAL_KEY`: `externalKey` del primer admin local, usado solo por `npm run bootstrap:admin`.

Cookies locales:

- `intranet_oauth_state`: cookie temporal HTTP-only para correlacionar login/callback.
- `intranet_pkce_verifier`: cookie temporal HTTP-only para guardar el `code_verifier` durante el flujo OAuth.
- `intranet_access`: access token HTTP-only.
- `intranet_refresh`: refresh token HTTP-only.

Rutas auth finales:

- `GET /auth/login`: inicia el flujo OAuth.
- `GET /auth/callback`: recibe el callback de Identity Hub.
- `GET /api/auth/me`: devuelve el usuario autenticado y permisos efectivos.
- `POST /api/auth/logout`: limpia cookies locales.

Intranet usa prefijo global `api` para APIs REST. Solo `GET /auth/login` y `GET /auth/callback` quedan fuera del prefijo porque son rutas OAuth de navegador.

Importacion de usuarios:

- `GET /api/users/identity-candidates?term=...` busca usuarios asignables en Identity Hub.
- `GET /api/users/identity-candidates/:externalKey` obtiene un candidato exacto.
- `POST /api/users/import-from-identity` crea el usuario local por `externalKey` y puede recibir `roleIds` para asignar roles locales elegidos manualmente por el administrador.

El navegador no llama directamente a Identity Hub. Intranet usa el cliente interno service-to-service contra `/internal/users/assignable` con Basic Auth usando `OAUTH_CLIENT_ID` y `OAUTH_CLIENT_SECRET`.

En local `IDENTITY_HUB_URL` e `IDENTITY_HUB_INTERNAL_URL` normalmente tienen el mismo valor. En Docker, produccion o redes internas pueden diferir: la primera debe ser accesible por el navegador y la segunda por el backend de Intranet.

Usuarios shadow y acceso:

- `syncUserFromIdentity` se ejecuta despues de un login/callback SSO exitoso, usa el access token ya verificado, crea el shadow user si no existe y actualiza solo `fullName` cuando cambio.
- Cuando crea un usuario shadow nuevo, asigna todos los roles locales con `isAutoAssigned = true`; si no existe ninguno, crea el usuario sin roles y registra un warning.
- `syncUserFromIdentity` no autoriza acceso global, no consulta usuarios asignables en Identity Hub, no corre en cada request, no sobrescribe roles locales existentes y no toca permisos locales.
- `importFromIdentity` no aplica roles autoasignables; usa solo los `roleIds` seleccionados manualmente.
- Para quitar acceso a Intranet se revoca la aplicacion desde Identity Hub; el shadow user local no se borra.
- Para cambiar lo que el usuario puede hacer dentro de Intranet se modifican roles/permisos locales.
- Si se vuelve a dar acceso desde Identity Hub, la Intranet reutiliza el shadow user existente y conserva sus roles locales.

PKCE S256:

- `GET /auth/login` genera `state` y `code_verifier` aleatorios.
- Intranet calcula `code_challenge = base64url(sha256(code_verifier))`.
- La redireccion a Identity Hub incluye `code_challenge` y `code_challenge_method=S256`.
- `state` y `code_verifier` se guardan temporalmente en cookies HTTP-only con TTL corto y `path=/auth`.
- `GET /auth/callback` valida `state` antes de procesar exito o error, recupera `code_verifier` y lo envia en el canje del authorization code.
- `plain` no esta soportado.

La guia detallada del flujo, responsabilidades, cookies, validacion JWT/JWKS, refresh rotation, usuarios locales y logout esta en `docs/sso-client-integration.md`.

### Frontend Angular

En desarrollo, Angular puede correr separado y llamar al backend con rutas `/api/*`; configura `CORS_ORIGIN` e `INTRANET_UI_BASE_URL`, por ejemplo `http://localhost:4200`.

En produccion, copia el build Angular a `public/browser`. NestJS sirve esa carpeta con `ServeStaticModule`; las rutas SPA como `/admin`, `/auth/error` o `/documents` resuelven a `index.html`. Las rutas `/api/*`, `/auth/login` y `/auth/callback` no son interceptadas por el servidor estatico. En produccion puede omitirse `INTRANET_UI_BASE_URL` para usar redirects relativos.

### Bootstrap local de seguridad

Las migraciones o `synchronize` de TypeORM definen estructura de base de datos. El bootstrap crea datos base locales de Intranet: permisos, rol `ADMIN` y, solo si aun no existe ningun admin local, el primer usuario shadow asociado a un `externalKey` de Identity Hub.

El bootstrap no crea usuarios globales en Identity Hub, no registra aplicaciones OAuth, no asigna roles del Hub y no mezcla permisos locales con permisos globales. Identity Hub autentica y controla el acceso global a la aplicacion; Intranet autoriza acciones internas con sus propias tablas de roles y permisos.

Ejecuta el bootstrap despues de tener la base de datos disponible, la aplicacion cliente configurada en Identity Hub y el usuario asignable creado/asignado en el Hub:

```bash
BOOTSTRAP_ADMIN_EXTERNAL_KEY=IDH-U-... npm run bootstrap:admin
```

El comando es idempotente: ejecuta `ensurePermissions()` para sincronizar `PERMISSIONS_SEED`, ejecuta `ensureAdminRole()` para asegurar el rol local `ADMIN` con todos los permisos y `isAutoAssigned = false`, y crea el primer admin local solo cuando no existe ningun admin local. Si ya existe un `ADMIN`, no crea ni promueve usuarios adicionales. Si el `externalKey` ya existe localmente sin ser admin, falla para evitar una promocion accidental.

El bootstrap no crea roles autoasignables normales. Los roles con `isAutoAssigned = true` se configuran desde el CRUD de roles; si no existe ninguno, los usuarios nuevos por SSO/JIT se crean sin roles y se registra un warning. El login normal no asigna `ADMIN` ni usa roles internos de Identity Hub.

### Migraciones TypeORM

El proyecto esta preparado para migraciones TypeORM, pero todavia no existe una migracion versionada para `roles.isAutoAssigned` ni una migracion inicial definitiva porque el esquema sigue en revision.

- En desarrollo local puede usarse `DB_SYNCHRONIZE=true` para iterar rapidamente.
- En staging y produccion usa siempre `DB_SYNCHRONIZE=false`.
- El runtime de Nest lee `DB_SYNCHRONIZE` para decidir `synchronize`.
- El DataSource para CLI esta en `src/database/data-source.ts` y usa `synchronize: false` fijo.
- Las migraciones se guardan en `src/database/migrations` y deben versionarse en Git.
- `bootstrap-admin` no reemplaza migraciones: las migraciones cambian estructura; el bootstrap crea datos base locales.

Comandos:

```bash
npm run migration:generate -- src/database/migrations/NombreDeMigracion
npm run migration:run
npm run migration:revert
```

`migration:generate` crea un archivo de migracion comparando entidades contra la base configurada. `migration:run` aplica migraciones pendientes. `migration:revert` revierte la ultima migracion aplicada.

Mientras no exista una migracion de esquema versionada para estos cambios, aplica este SQL operativo en la base de Intranet si corresponde:

```sql
ALTER TABLE roles ADD COLUMN IF NOT EXISTS "isAutoAssigned" boolean NOT NULL DEFAULT false;
ALTER TABLE users DROP COLUMN IF EXISTS "isActive";
```

No borres usuarios shadow locales ni modifiques tablas de Identity Hub desde este cliente.

## Ejecucion del proyecto

### Modo desarrollo

```bash
npm run start:dev
```

### Modo produccion

```bash
npm run build
npm run start:prod
```
