# Integracion SSO de Intranet con Identity Hub

## Alcance

La Intranet actua como cliente OAuth de Identity Hub. Identity Hub autentica la identidad global, administra `user.isActive` central y controla el acceso usuario-aplicacion. Intranet autoriza con usuarios shadow, roles locales, permisos locales y `users.isActive` local. El frontend Angular no intercambia tokens directamente y no llama a Identity Hub para importar usuarios.

## Responsabilidades del backend

- `OAuthController`: expone las rutas de navegador `/auth/login` y `/auth/callback`, valida la correlacion del callback y setea/limpia cookies.
- `OAuthService`: orquesta el Authorization Code Flow: crea la solicitud de autorizacion, canjea el code, valida el access token y sincroniza el usuario local.
- `PkceService`: genera `code_verifier` y calcula `code_challenge` S256.
- `AuthCookieService`: administra cookies HTTP-only locales, tanto las temporales OAuth como las de sesion de Intranet.
- `IdentityService`: llama al token endpoint de Identity Hub para canje de code y refresh rotation.
- `TokenVerifierService` y `JwksService`: validan JWT RS256 con JWKS, issuer y audience.
- `OAuthGuard`: protege APIs, carga el usuario local por `externalKey` y refresca tokens cuando el access token expira.

No hay canje de authorization code en el frontend. No se usan roles de Identity Hub para autorizar en Intranet, y no se registran roles internos de Intranet en Identity Hub.

## Flujo OAuth

1. El navegador llama `GET /auth/login`.
2. Intranet genera `state` y `code_verifier`, calcula `code_challenge` S256, los guarda temporalmente y redirige a Identity Hub.
3. Identity Hub autentica al usuario y redirige a `GET /auth/callback`.
4. Intranet valida `state`, recupera `code_verifier`, intercambia el `authorization code` por tokens y verifica el access token.
5. Intranet sincroniza o crea el shadow user local por `externalKey`.
6. Intranet setea cookies locales y redirige a `/admin` o a `{INTRANET_UI_BASE_URL}/admin`.

Si el callback falla, Intranet limpia `intranet_oauth_state` y redirige a `/auth/error?error=...` o a `{INTRANET_UI_BASE_URL}/auth/error?error=...`.

La URL de autorizacion enviada a Identity Hub contiene:

- `client_id`
- `redirect_uri`
- `response_type=code`
- `state`
- `code_challenge`
- `code_challenge_method=S256`

Intranet no envia `scope` mientras Identity Hub no tenga soporte real de scopes.

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

En desarrollo, Angular puede correr separado. En ese caso `CORS_ORIGIN` permite un unico origen del dev server y `INTRANET_UI_BASE_URL` puede apuntar a ese origen, por ejemplo `http://localhost:4200`. En produccion, copia el build Angular a `public/browser`; `INTRANET_UI_BASE_URL` puede omitirse para redirigir a rutas relativas servidas por NestJS.

## Cookies locales

Temporales OAuth:

- `intranet_oauth_state`: correlaciona login/callback.
- `intranet_pkce_verifier`: guarda el `code_verifier`.

Sesion local de Intranet:

- `intranet_access`: access token emitido para Intranet.
- `intranet_refresh`: refresh token rotativo.

Las cookies de sesion local usan `path: '/'`. Las cookies temporales OAuth usan `path: '/auth'` y TTL corto de 5 minutos. Todas usan `httpOnly`, `secure` por `AUTH_COOKIE_SECURE` y `sameSite` por `AUTH_COOKIE_SAME_SITE` con valor por defecto `lax`. `clearCookie` usa las mismas opciones base que `setCookie`.

## PKCE S256

`GET /auth/login` genera un `code_verifier` criptograficamente seguro y calcula:

```text
code_challenge = base64url(sha256(code_verifier))
code_challenge_method = S256
```

El `code_verifier` no se envia al navegador como dato legible ni se envia a `/oauth/authorize`; queda en cookie temporal HTTP-only y se usa solo en `/oauth/token`. Intranet no soporta `plain`.

## Tokens de Identity Hub

Intranet recibe `accessToken`, `refreshToken`, `accessTokenExpiresIn`, `refreshTokenExpiresIn` y `tokenType` desde `/oauth/token`. En el canje de authorization code envia `grant_type`, `client_id`, `client_secret`, `redirect_uri`, `code` y `code_verifier`. El backend guarda los tokens solo en cookies HTTP-only para el navegador.

Los refresh tokens son rotativos. Cuando el access token expira, el guard usa la cookie `intranet_refresh`, llama a `/oauth/token` con `grant_type=refresh_token` y reemplaza inmediatamente las cookies locales con los tokens nuevos. Si el refresh falla, limpia la sesion local.

## Verificacion JWT

`TokenVerifierService` valida access tokens con RS256 y JWKS. La URL JWKS se toma de `IDENTITY_HUB_JWKS_URL` o de `IDENTITY_HUB_URL/.well-known/jwks.json`. El `issuer` esperado viene de `OAUTH_ISSUER`; el `audience` esperado es `OAUTH_CLIENT_ID`, alineado con Gaceta.

El guard diferencia access token expirado de token invalido. Solo intenta refresh cuando el access token expiro.

## Shadow user local

La clave de integracion es `externalKey`. Durante login, Intranet consulta el usuario asignable en Identity Hub, crea el usuario local si no existe y actualiza solo datos seguros de identidad como `fullName`. No sobrescribe roles locales, no sobrescribe `users.isActive` local y no asigna `ADMIN` durante login.

`users.isActive` es un bloqueo local de Intranet: significa que el shadow user esta habilitado para operar dentro de Intranet. No es una copia de `user.isActive` central de Identity Hub y no se sincroniza desde el Hub en cada login. Si `users.isActive` local es `false`, el usuario puede seguir autenticandose en Identity Hub, pero Intranet debe bloquearlo con `403 Forbidden` porque ya esta autenticado y no esta autorizado localmente.

Los usuarios shadow no deben borrarse automaticamente cuando Identity Hub desactiva un usuario o le quita acceso a la aplicacion, porque pueden tener historial local. Para quitar acceso central se usa Identity Hub. Para suspender solo en Intranet se usa `users.isActive = false`.

## Importacion administrativa

La UI administrativa llama al backend de Intranet. El navegador no llama directamente a Identity Hub. Intranet usa el cliente interno service-to-service contra `/internal/users/assignable` con Basic Auth usando `OAUTH_CLIENT_ID` y `OAUTH_CLIENT_SECRET`.

`IDENTITY_HUB_URL` es la URL publica/navegable del Hub y se usa para construir la redireccion del navegador a `/oauth/authorize`; tambien es la base para JWKS cuando `IDENTITY_HUB_JWKS_URL` no esta definida. `IDENTITY_HUB_INTERNAL_URL` es la URL server-to-server para endpoints `/internal/*`. En local pueden ser iguales, pero en Docker, produccion o una red privada pueden apuntar a hosts distintos.

La importacion evita duplicados por `externalKey`. Si el usuario ya existe, devuelve conflicto. Los roles locales se asignan solo si el endpoint recibe `roleIds`. Los usuarios creados por importacion nacen con `users.isActive = true` local por defecto.

## Bootstrap del primer admin

El primer admin local se crea con un comando local:

```bash
BOOTSTRAP_ADMIN_EXTERNAL_KEY=IDH-U-... npm run bootstrap:admin
```

Este comando es bootstrap de datos locales, no una migracion. Las migraciones o `synchronize` definen estructura; el bootstrap sincroniza datos base de seguridad de Intranet. No crea usuarios globales en Identity Hub, no registra clientes OAuth y no asigna roles del Hub.

El comando:

- lee `BOOTSTRAP_ADMIN_EXTERNAL_KEY`;
- siembra permisos base desde `PERMISSIONS_SEED`;
- asegura que el rol local `ADMIN` exista;
- asocia todos los permisos locales existentes al rol `ADMIN` sin duplicar relaciones;
- consulta Identity Hub por el usuario asignable;
- crea el shadow user local con rol `ADMIN` solo si no existe ningun admin local;
- no hace nada si ya existe al menos un `ADMIN` local;
- falla si el `externalKey` ya existe localmente sin rol `ADMIN`;
- no promueve usuarios existentes no-admin;
- no depende de endpoints HTTP publicos;
- no se mezcla con el login normal.

Si despues de sembrar permisos no existe ningun permiso, el bootstrap falla con error claro y no crea un rol `ADMIN` vacio. Cuando el rol `ADMIN` existe, el bootstrap agrega permisos faltantes sin eliminar permisos ya asignados. Actualmente no se siembra un rol base `USER`; los roles no-admin se gestionan desde la UI administrativa.

Los admins posteriores se gestionan desde la UI administrativa mediante roles locales.

## Logout local vs global

`POST /api/auth/logout` limpia cookies locales de Intranet. No revoca la sesion global de Identity Hub. Si se agrega logout centralizado en Identity Hub, debe integrarse sin cambiar la separacion de responsabilidades.

## Seguridad operativa

- `state` es obligatorio y se valida antes de procesar callbacks exitosos o con error.
- `code_verifier` se guarda temporalmente en cookie HTTP-only y se limpia al terminar el callback.
- `code_challenge_method` es siempre `S256`; `plain` no se soporta.
- El backend no debe loguear `client_secret`, authorization codes, `code_verifier`, access tokens, refresh tokens ni passwords.
- Los roles y permisos usados por guards de Intranet son locales.

## Variables de entorno

- `INTRANET_UI_BASE_URL` opcional
- `DB_SYNCHRONIZE`, `true` solo para desarrollo local y `false` para staging/produccion
- `OAUTH_CLIENT_ID`
- `OAUTH_CLIENT_SECRET`
- `OAUTH_REDIRECT_URI`
- `OAUTH_ISSUER`
- `IDENTITY_HUB_URL`
- `IDENTITY_HUB_INTERNAL_URL`
- `IDENTITY_HUB_JWKS_URL` opcional
- `CORS_ORIGIN` opcional, un unico origen permitido cuando el frontend corre separado
- `AUTH_COOKIE_SECURE`
- `AUTH_COOKIE_SAME_SITE` opcional
- `BOOTSTRAP_ADMIN_EXTERNAL_KEY` solo para `npm run bootstrap:admin`

## Checklist manual breve

- `GET /auth/login` redirige a Identity Hub con `state`, `code_challenge` y `code_challenge_method=S256`, sin `scope`.
- Un callback valido crea `intranet_access` e `intranet_refresh`, y limpia `intranet_oauth_state` e `intranet_pkce_verifier`.
- Callback con `state` invalido o sin `code_verifier` redirige a error y limpia cookies temporales.
- `GET /api/auth/me` devuelve el usuario local, roles y permisos usando cookies HTTP-only.
- Access token expirado rota tokens con `intranet_refresh`; refresh invalido limpia sesion local.
- `POST /api/auth/logout` limpia cookies locales sin asumir logout global del Hub.
