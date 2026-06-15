# Integracion SSO de Intranet con Identity Hub

## Alcance

La Intranet actua como cliente OAuth de Identity Hub. Identity Hub autentica la identidad global y es la unica fuente de verdad del acceso global a la aplicacion mediante `user.isActive` central, `application.isActive` y la relacion `user_applications`. Intranet conserva usuarios shadow locales, `externalKey`, `fullName`, roles/permisos locales y referencias internas de auditoria. El frontend Angular no intercambia tokens directamente y no llama a Identity Hub para importar usuarios.

## Responsabilidades del backend

- `OAuthController`: expone las rutas de navegador `/auth/login` y `/auth/callback`, valida la correlacion del callback y setea/limpia cookies.
- `OAuthService`: orquesta el Authorization Code Flow: crea la solicitud de autorizacion, canjea el code, valida el access token y sincroniza el usuario local.
- `PkceService`: genera `code_verifier` y calcula `code_challenge` S256.
- `AuthCookieService`: administra cookies HTTP-only locales, tanto las temporales OAuth como las de sesion de Intranet.
- `IdentityService`: llama al token endpoint de Identity Hub para canje de code y refresh rotation.
- `TokenVerifierService` y `JwksService`: validan JWT RS256 con JWKS, issuer y audience.
- `OAuthGuard`: protege APIs, carga el usuario shadow local por `externalKey`, refresca tokens cuando el access token expira y deja la autorizacion fina a roles/permisos locales.

No hay canje de authorization code en el frontend. No se usan roles de Identity Hub para autorizar en Intranet, y no se registran roles internos de Intranet en Identity Hub.

## Flujo OAuth

1. El navegador llama `GET /auth/login`.
2. Intranet genera `state` y `code_verifier`, calcula `code_challenge` S256, los guarda temporalmente y redirige a Identity Hub.
3. Identity Hub autentica al usuario y redirige a `GET /auth/callback`.
4. Intranet valida `state`, recupera `code_verifier`, intercambia el `authorization code` por tokens y verifica el access token.
5. Intranet sincroniza o crea el shadow user local por `externalKey`; esta sincronizacion proyecta identidad local y asigna roles iniciales locales solo si el usuario shadow es nuevo, no autoriza acceso global.
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
- `GET /api/auth/me`: devuelve el usuario autenticado y permisos efectivos.
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

La clave de integracion es `externalKey`. Durante un login/callback SSO exitoso, Intranet usa el access token ya verificado para crear el usuario local si no existe y actualizar solo `fullName` cuando cambio. `syncUserFromIdentity` no consulta usuarios asignables en Identity Hub, no se ejecuta en cada request, no autoriza acceso global, no sobrescribe roles locales, no toca permisos locales y no asigna `ADMIN` durante login.

Cuando `syncUserFromIdentity` crea un usuario shadow nuevo, busca todos los roles locales con `isAutoAssigned = true` y los asigna como roles iniciales. Puede haber cero, uno o varios roles autoasignables. Si no existe ningun rol con `isAutoAssigned = true`, el usuario se crea sin roles y se registra un warning; el login no falla por falta de roles locales iniciales. Los logins posteriores reutilizan el shadow user existente, conservan sus roles y solo actualizan `fullName` si cambio.

El sistema cliente no tiene `isActive` local en usuarios shadow. El shadow user no representa acceso vigente; representa identidad proyectada, roles/permisos locales e historial interno. Si un usuario no debe acceder a Intranet, se revoca la aplicacion desde Identity Hub eliminando la relacion usuario-aplicacion. Si se quiere cambiar lo que el usuario puede hacer dentro de Intranet, se modifican roles/permisos locales.

Los usuarios shadow no se borran cuando Identity Hub desactiva un usuario o le quita acceso a la aplicacion, porque pueden tener historial local, auditoria interna y relaciones existentes. Si luego Identity Hub vuelve a dar acceso a la aplicacion, `syncUserFromIdentity` reutiliza el shadow user existente y conserva sus roles locales.

El guard de Intranet valida cookies/tokens, carga el shadow user local existente por `externalKey` y aplica roles/permisos locales cuando corresponda. No valida `isActive` local. Si el usuario central, la aplicacion o la relacion `user_applications` no permiten acceso, el bloqueo debe ocurrir en Identity Hub durante authorize/token/refresh.

En el futuro, la auditoria de asignaciones y revocaciones de aplicaciones debe vivir en una tabla separada de eventos/auditoria en Identity Hub, no en los usuarios shadow del cliente.

## Importacion administrativa

La UI administrativa llama al backend de Intranet. El navegador no llama directamente a Identity Hub. Intranet usa el cliente interno service-to-service contra `/internal/users/assignable` con Basic Auth usando `OAUTH_CLIENT_ID` y `OAUTH_CLIENT_SECRET`.

`IDENTITY_HUB_URL` es la URL publica/navegable del Hub y se usa para construir la redireccion del navegador a `/oauth/authorize`; tambien es la base para JWKS cuando `IDENTITY_HUB_JWKS_URL` no esta definida. `IDENTITY_HUB_INTERNAL_URL` es la URL server-to-server para endpoints `/internal/*`. En local pueden ser iguales, pero en Docker, produccion o una red privada pueden apuntar a hosts distintos.

La importacion evita duplicados por `externalKey`. Si el usuario ya existe, devuelve conflicto. Los roles locales se asignan solo si el endpoint recibe `roleIds`; Identity Hub no decide roles locales. `importFromIdentity` usa exclusivamente la seleccion manual enviada por el administrador y no aplica automaticamente roles con `isAutoAssigned = true`. La importacion crea el shadow user con `externalKey` y `fullName`, sin guardar email/login si el diseno actual del cliente no los persiste y sin `isActive` local.

## Bootstrap del primer admin

El primer admin local se crea con un comando local:

```bash
BOOTSTRAP_ADMIN_EXTERNAL_KEY=IDH-U-... npm run bootstrap:admin
```

Este comando es bootstrap de datos locales, no una migracion. Las migraciones o `synchronize` definen estructura; el bootstrap sincroniza datos base de seguridad de Intranet. No crea usuarios globales en Identity Hub, no registra clientes OAuth y no asigna roles del Hub.

El comando:

- lee `BOOTSTRAP_ADMIN_EXTERNAL_KEY`;
- ejecuta `ensurePermissions()` para sembrar permisos base desde `PERMISSIONS_SEED`;
- ejecuta `ensureAdminRole()` para asegurar que el rol local `ADMIN` exista con todos los permisos locales y `isAutoAssigned = false`;
- consulta Identity Hub por el usuario asignable;
- crea el shadow user local con rol `ADMIN` solo si no existe ningun admin local;
- no hace nada si ya existe al menos un `ADMIN` local;
- falla si el `externalKey` ya existe localmente sin rol `ADMIN`;
- no promueve usuarios existentes no-admin;
- no depende de endpoints HTTP publicos;
- no se mezcla con el login normal.

Si despues de sembrar permisos no existe ningun permiso, el bootstrap falla con error claro y no crea un rol `ADMIN` vacio. Cuando el rol `ADMIN` existe, el bootstrap agrega permisos faltantes sin eliminar permisos ya asignados y fuerza `isAutoAssigned = false` para evitar asignarlo por JIT. El bootstrap no crea roles autoasignables normales; los roles con `isAutoAssigned = true` se configuran desde el CRUD de roles. Si no hay roles autoasignables, los usuarios nuevos por SSO/JIT se crean sin roles y se registra un warning.

Los admins posteriores se gestionan desde la UI administrativa mediante roles locales.

## Cambio operativo de base de datos

El proyecto incluye una migracion TypeORM para agregar `roles.isAutoAssigned`. En ambientes que todavia tengan la columna local antigua de usuarios, aplicar tambien el cambio operativo sobre la base de Intranet:

```sql
ALTER TABLE roles ADD COLUMN IF NOT EXISTS "isAutoAssigned" boolean NOT NULL DEFAULT false;
ALTER TABLE users DROP COLUMN IF EXISTS "isActive";
```

No se deben borrar registros de usuarios locales ni modificar tablas de Identity Hub desde este cliente.

## Logout local vs global

`POST /api/auth/logout` limpia cookies locales de Intranet. No revoca la sesion global de Identity Hub. Si se agrega logout centralizado en Identity Hub, debe integrarse sin cambiar la separacion de responsabilidades.

## Seguridad operativa

- `state` es obligatorio y se valida antes de procesar callbacks exitosos o con error.
- `code_verifier` se guarda temporalmente en cookie HTTP-only y se limpia al terminar el callback.
- `code_challenge_method` es siempre `S256`; `plain` no se soporta.
- El backend no debe loguear `client_secret`, authorization codes, `code_verifier`, access tokens, refresh tokens ni passwords.
- Los roles y permisos usados por guards de Intranet son locales.
- La revocacion de acceso global a Intranet se gestiona en Identity Hub, no con campos locales del shadow user.

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
- `GET /api/auth/me` devuelve el usuario local y permisos efectivos usando cookies HTTP-only.
- Access token expirado rota tokens con `intranet_refresh`; refresh invalido limpia sesion local.
- `POST /api/auth/logout` limpia cookies locales sin asumir logout global del Hub.
