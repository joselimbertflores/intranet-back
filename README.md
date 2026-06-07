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

La Intranet funciona como cliente OAuth de Identity Hub. Identity Hub autentica la identidad global y la Intranet conserva el usuario local, roles y permisos locales.

Variables principales:

- `INTRANET_UI_BASE_URL`: URL base opcional del frontend. Si existe, login correcto redirige a `{INTRANET_UI_BASE_URL}/admin` y errores a `{INTRANET_UI_BASE_URL}/auth/error?error=...`. Si se omite, usa `/admin` y `/auth/error?error=...`.
- `NODE_ENV`: `development` o `production`. En `production`, TypeORM usa `synchronize: false`.
- `OAUTH_CLIENT_ID`: identificador del cliente OAuth registrado en Identity Hub.
- `OAUTH_CLIENT_SECRET`: secreto del cliente OAuth registrado en Identity Hub.
- `OAUTH_REDIRECT_URI`: callback local, por ejemplo `http://localhost:3000/auth/callback`.
- `OAUTH_ISSUER`: issuer esperado en el access token.
- `IDENTITY_HUB_URL`: URL publica/base de Identity Hub para OAuth y JWKS.
- `IDENTITY_HUB_INTERNAL_URL`: URL interna para `/internal/users/assignable`.
- `IDENTITY_HUB_JWKS_URL`: URL JWKS opcional. Si se omite, se usa `IDENTITY_HUB_URL/.well-known/jwks.json`.
- `CORS_ORIGIN`: origenes permitidos separados por coma. Solo aplica cuando `NODE_ENV=development`.
- `AUTH_COOKIE_SECURE`: `true` en HTTPS.
- `AUTH_COOKIE_SAME_SITE`: opcional, `lax`, `strict` o `none`. Por defecto es `lax`.
- `BOOTSTRAP_ADMIN_EXTERNAL_KEY`: `externalKey` del primer admin local, usado solo por `npm run bootstrap:admin`.

Cookies locales:

- `intranet_oauth_state`: cookie temporal HTTP-only para correlacionar login/callback.
- `intranet_access`: access token HTTP-only.
- `intranet_refresh`: refresh token HTTP-only.

Rutas auth finales:

- `GET /auth/login`: inicia el flujo OAuth.
- `GET /auth/callback`: recibe el callback de Identity Hub.
- `GET /api/auth/me`: devuelve el usuario autenticado, roles y permisos.
- `POST /api/auth/logout`: limpia cookies locales.

Intranet usa prefijo global `api` para APIs REST. Solo `GET /auth/login` y `GET /auth/callback` quedan fuera del prefijo porque son rutas OAuth de navegador.

Importacion de usuarios:

- `GET /api/users/identity-candidates?term=...` busca usuarios asignables en Identity Hub.
- `GET /api/users/identity-candidates/:externalKey` obtiene un candidato exacto.
- `POST /api/users/import-from-identity` crea el usuario local por `externalKey` y puede recibir `roleIds` para asignar roles locales.

El navegador no llama directamente a Identity Hub. Intranet usa el cliente interno service-to-service contra `/internal/users/assignable` con Basic Auth usando `OAUTH_CLIENT_ID` y `OAUTH_CLIENT_SECRET`.

### Frontend Angular

En desarrollo, Angular puede correr separado y llamar al backend con rutas `/api/*`; configura `NODE_ENV=development`, `CORS_ORIGIN` e `INTRANET_UI_BASE_URL`, por ejemplo `http://localhost:4200`.

En produccion, copia el build Angular a `public/browser`. NestJS sirve esa carpeta con `ServeStaticModule`; las rutas SPA como `/admin`, `/auth/error` o `/documents` resuelven a `index.html`. Las rutas `/api/*`, `/auth/login` y `/auth/callback` no son interceptadas por el servidor estatico. En produccion puede omitirse `INTRANET_UI_BASE_URL` para usar redirects relativos.

Bootstrap del primer admin:

```bash
BOOTSTRAP_ADMIN_EXTERNAL_KEY=IDH-U-... npm run bootstrap:admin
```

El comando es autosuficiente: siembra `PERMISSIONS_SEED`, asegura que el rol `ADMIN` exista con todos los permisos disponibles y crea el primer shadow user local con rol `ADMIN` solo cuando no existe ningun admin local. Si ya existe un `ADMIN`, no crea usuarios adicionales. El login normal no asigna `ADMIN`; los roles posteriores se gestionan desde la UI administrativa.

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
