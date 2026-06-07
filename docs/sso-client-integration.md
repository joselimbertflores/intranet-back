# Integracion SSO de Intranet con Identity Hub

## Alcance

La Intranet actua como cliente OAuth de Identity Hub. Identity Hub autentica la identidad global; Intranet autoriza con usuarios shadow, roles locales y permisos locales. El frontend Angular no intercambia tokens directamente y no llama a Identity Hub para importar usuarios.

## Flujo OAuth

1. El navegador llama `GET /auth/login`.
2. Intranet genera `state`, lo guarda en la cookie HTTP-only `intranet_oauth_state` y redirige a Identity Hub.
3. Identity Hub autentica al usuario y redirige a `GET /auth/callback`.
4. Intranet valida `state`, intercambia el `authorization code` por tokens y verifica el access token.
5. Intranet sincroniza o crea el shadow user local por `externalKey`.
6. Intranet setea cookies locales y redirige a `/admin` o a `{INTRANET_UI_BASE_URL}/admin`.

Si el callback falla, Intranet limpia `intranet_oauth_state` y redirige a `/auth/error?error=...` o a `{INTRANET_UI_BASE_URL}/auth/error?error=...`.

La URL de autorizacion enviada a Identity Hub contiene solo:

- `client_id`
- `redirect_uri`
- `response_type=code`
- `state`

## Rutas principales

- `GET /auth/login`: inicia el flujo OAuth.
- `GET /auth/callback`: recibe el callback de Identity Hub.
- `GET /api/auth/me`: devuelve el usuario autenticado, roles y permisos.
- `POST /api/auth/logout`: limpia cookies locales.
- `GET /api/users/identity-candidates?term=...`: busca usuarios asignables en Identity Hub.
- `GET /api/users/identity-candidates/:externalKey`: obtiene un candidato exacto.
- `POST /api/users/import-from-identity`: crea un usuario local importado y opcionalmente asigna `roleIds`.

Intranet define `app.setGlobalPrefix('api')` en `main.ts`. Solo `GET /auth/login` y `GET /auth/callback` quedan fuera de `/api` porque son rutas OAuth de navegador.

## Frontend Angular y rutas SPA

En produccion, NestJS sirve el build Angular con `ServeStaticModule` desde `public/browser`.

El servidor estatico excluye:

- `/api/*`
- `/auth/login`
- `/auth/callback`

Por eso las APIs REST se resuelven en Nest bajo `/api`, las rutas OAuth de navegador siguen en `/auth/*`, y las rutas SPA como `/admin`, `/auth/error` o `/documents` hacen fallback a `index.html`.

En desarrollo, Angular puede correr separado. En ese caso `NODE_ENV=development`, `CORS_ORIGIN` permite el origen del dev server y `INTRANET_UI_BASE_URL` puede apuntar a ese origen, por ejemplo `http://localhost:4200`. En produccion, copia el build Angular a `public/browser`; `INTRANET_UI_BASE_URL` puede omitirse para redirigir a rutas relativas servidas por NestJS.

## Cookies locales

- `intranet_oauth_state`: cookie temporal HTTP-only para correlacionar login/callback.
- `intranet_access`: access token HTTP-only.
- `intranet_refresh`: refresh token HTTP-only.

Todas usan `path: '/'`, `httpOnly`, `secure` por `AUTH_COOKIE_SECURE` y `sameSite` por `AUTH_COOKIE_SAME_SITE` con valor por defecto `lax`. `clearCookie` usa las mismas opciones base que `setCookie`.

## Tokens de Identity Hub

Intranet recibe `accessToken`, `refreshToken`, `accessTokenExpiresIn`, `refreshTokenExpiresIn` y `tokenType` desde `/oauth/token`. El backend guarda esos tokens solo en cookies HTTP-only para el navegador.

## Verificacion JWT

`TokenVerifierService` valida access tokens con RS256 y JWKS. La URL JWKS se toma de `IDENTITY_HUB_JWKS_URL` o de `IDENTITY_HUB_URL/.well-known/jwks.json`. El `issuer` esperado viene de `OAUTH_ISSUER`; el `audience` esperado es `OAUTH_CLIENT_ID`, alineado con Gaceta.

El guard diferencia access token expirado de token invalido. Solo intenta refresh cuando el access token expiro.

## Shadow user local

La clave de integracion es `externalKey`. Durante login, Intranet consulta el usuario asignable en Identity Hub, crea el usuario local si no existe y actualiza solo datos seguros de identidad como `fullName`. No sobrescribe roles locales y no asigna `ADMIN` durante login.

## Importacion administrativa

La UI administrativa llama al backend de Intranet. El navegador no llama directamente a Identity Hub. Intranet usa el cliente interno service-to-service contra `/internal/users/assignable` con Basic Auth usando `OAUTH_CLIENT_ID` y `OAUTH_CLIENT_SECRET`.

La importacion evita duplicados por `externalKey`. Si el usuario ya existe, devuelve conflicto. Los roles locales se asignan solo si el endpoint recibe `roleIds`.

## Bootstrap del primer admin

El primer admin local se crea con un comando local:

```bash
BOOTSTRAP_ADMIN_EXTERNAL_KEY=IDH-U-... npm run bootstrap:admin
```

El comando:

- lee `BOOTSTRAP_ADMIN_EXTERNAL_KEY`;
- siembra permisos base desde `PERMISSIONS_SEED`;
- asegura que el rol `ADMIN` exista;
- asocia todos los permisos existentes al rol `ADMIN`;
- consulta Identity Hub por el usuario asignable;
- crea el shadow user local con rol `ADMIN` solo si no existe ningun admin local;
- no hace nada si ya existe al menos un `ADMIN` local;
- falla si el `externalKey` ya existe localmente sin rol `ADMIN`;
- no promueve usuarios existentes no-admin;
- no depende de endpoints HTTP publicos;
- no se mezcla con el login normal.

Si despues de sembrar permisos no existe ningun permiso, el bootstrap falla con error claro y no crea un rol `ADMIN` vacio. Cuando el rol `ADMIN` existe, el bootstrap agrega permisos faltantes sin eliminar permisos ya asignados.

Los admins posteriores se gestionan desde la UI administrativa mediante roles locales.

## Logout local vs global

`POST /api/auth/logout` limpia cookies locales de Intranet. No revoca la sesion global de Identity Hub. Si se agrega logout centralizado en Identity Hub, debe integrarse sin cambiar la separacion de responsabilidades.

## Variables de entorno

- `INTRANET_UI_BASE_URL` opcional
- `NODE_ENV`
- `OAUTH_CLIENT_ID`
- `OAUTH_CLIENT_SECRET`
- `OAUTH_REDIRECT_URI`
- `OAUTH_ISSUER`
- `IDENTITY_HUB_URL`
- `IDENTITY_HUB_INTERNAL_URL`
- `IDENTITY_HUB_JWKS_URL` opcional
- `CORS_ORIGIN` opcional, solo aplica en desarrollo
- `AUTH_COOKIE_SECURE`
- `AUTH_COOKIE_SAME_SITE` opcional
- `BOOTSTRAP_ADMIN_EXTERNAL_KEY` solo para `npm run bootstrap:admin`

## Pruebas manuales basicas

1. Ejecutar `GET /auth/login` y confirmar redireccion a Identity Hub sin parametro `scope`.
2. Completar callback y verificar cookies `intranet_access`, `intranet_refresh` y limpieza de `intranet_oauth_state`.
3. Consultar `GET /api/auth/me` con cookies de sesion.
4. Ejecutar `POST /api/auth/logout` y verificar limpieza de cookies.
5. Probar callback con `state` invalido y verificar redireccion de error.
6. Expirar access token y confirmar refresh con cookie nueva.
7. Invalidar refresh token y confirmar limpieza de cookies.
8. Buscar e importar usuarios desde `/api/users/identity-candidates`.
9. Ejecutar `BOOTSTRAP_ADMIN_EXTERNAL_KEY=IDH-U-... npm run bootstrap:admin` en una base sin admins.
10. Repetir el bootstrap y confirmar que no crea usuarios adicionales.
