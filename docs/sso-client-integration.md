# Integracion SSO de Intranet con Identity Hub

## Alcance y responsabilidades

Identity Hub administra identidad, credenciales, estado global y asignacion de usuarios a la aplicacion. Intranet es un cliente OAuth confidencial y administra su propia sesion, usuarios shadow, roles y permisos locales.

La clave estable de integracion es `externalKey`. El claim `sub` es un UUID interno de Identity Hub y no se usa para enlazar usuarios locales. Los roles y permisos siempre provienen de las tablas locales de Intranet; no se leen ni se reemplazan desde claims del access token.

El frontend solo navega por redirects y usa la sesion local de Intranet. Nunca recibe el `client_secret`, el authorization code canjeado, el `code_verifier`, access tokens ni refresh tokens. El cambio obligatorio, la recuperacion y el cambio normal de password se completan enteramente en la UI de Identity Hub.

## Componentes del backend

- `OAuthController` expone `GET /auth/login` y `GET /auth/callback`.
- `OAuthService` construye la autorizacion, canjea el code, verifica el JWT, sincroniza el usuario shadow y crea la sesion local.
- `OAuthTransactionService` guarda server-side la correlacion temporal del login, el hash de `state` y el `code_verifier`.
- `IdentityService` consume `/oauth/token` mediante formulario y HTTP Basic.
- `TokenVerifierService` y `JwksService` validan access tokens RS256 con JWKS.
- `AuthSessionService` guarda tokens server-side y serializa la rotacion por sesion.
- `AuthCookieService` solo administra identificadores opacos; no escribe tokens ni PKCE en cookies.
- `OAuthGuard` resuelve la sesion local, valida el access token, rota tokens cuando corresponde y carga roles/permisos locales.

`OAuthTransaction` y `AuthSession` son entidades TypeORM persistidas en PostgreSQL. Esta es una decision de implementacion de Intranet para cumplir el almacenamiento server-side; el contrato de Identity Hub exige el comportamiento, no estas entidades ni PostgreSQL para todos sus clientes.

## Rutas principales

- `GET /auth/login`: inicia el flujo OAuth.
- `GET /auth/callback`: recibe el callback de Identity Hub.
- `GET /api/auth/me`: devuelve el usuario autenticado y permisos efectivos.
- `POST /api/auth/logout`: elimina la sesion local.
- `GET /api/users/identity-candidates?term=...`: busca usuarios asignables en Identity Hub.
- `GET /api/users/identity-candidates/:externalKey`: obtiene un candidato exacto.
- `POST /api/users/import-from-identity`: crea un usuario shadow con roles locales seleccionados.

Intranet define `app.setGlobalPrefix('api')` en `main.ts`. Solo `GET /auth/login` y `GET /auth/callback` quedan fuera de `/api` porque son rutas OAuth de navegador.

## Frontend Angular y rutas SPA

En produccion, NestJS sirve el build Angular con `ServeStaticModule` desde `public/browser`.

El servidor estatico excluye:

- `/api/*`
- `/auth/login`
- `/auth/callback`

Por eso las APIs REST se resuelven en Nest bajo `/api`, las rutas OAuth de navegador siguen en `/auth/*`, y las rutas SPA como `/admin`, `/auth/error` o `/documents` hacen fallback a `index.html`.

En desarrollo, Angular puede correr separado. En ese caso `CORS_ORIGIN` permite un unico origen del dev server y `INTRANET_UI_BASE_URL` puede apuntar a ese origen, por ejemplo `http://localhost:4200`. En produccion, el build Angular se copia a `public/browser`; `INTRANET_UI_BASE_URL` puede omitirse para usar rutas relativas servidas por NestJS.

## Authorization Code con PKCE S256

1. El navegador solicita `GET /auth/login`.
2. Intranet genera un `state` aleatorio y un `code_verifier` PKCE de 43 a 128 caracteres permitidos.
3. Calcula `code_challenge = base64url(sha256(code_verifier))` sin padding.
4. Guarda server-side una transaccion con TTL de cinco minutos. La cookie HTTP-only `intranet_oauth_transaction` contiene solo su identificador opaco.
5. Redirige al navegador a `/oauth/authorize` con estos parametros exactos:
   - `response_type=code`
   - `client_id`
   - `redirect_uri`
   - `state`
   - `code_challenge`
   - `code_challenge_method=S256`
6. Identity Hub devuelve `code` y `state` a `GET /auth/callback` o devuelve `error=access_denied` y `state`.
7. El callback busca la transaccion mediante la cookie opaca, compara el hash de `state` y elimina la transaccion dentro de una operacion bloqueada. El `state` queda consumido antes de cualquier canje del code.
8. Un `state` ausente, desconocido, vencido, diferente o reutilizado descarta la transaccion y redirige a `/auth/error?error=invalid_state`. La vista local permite iniciar un login nuevo; el callback no crea un bucle automatico de autorizacion.
9. `access_denied` se muestra como falta de acceso y no se reintenta silenciosamente.

La URI de callback enviada en authorize y en el token request debe coincidir exactamente con `OAUTH_REDIRECT_URI` y con el registro de Identity Hub.

## Canje y rotacion de tokens

`POST /oauth/token` se ejecuta exclusivamente desde el backend con:

```http
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(formEncode(client_id) + ":" + formEncode(client_secret))
```

Canje del code:

```text
grant_type=authorization_code
code=<authorization-code>
redirect_uri=<callback-exacto>
code_verifier=<verifier-original>
```

Rotacion:

```text
grant_type=refresh_token
refresh_token=<refresh-token-actual>
```

El secreto no se envia en el body. El cliente confidencial tampoco repite `client_id` en el formulario. Todos los nombres externos son `snake_case`.

La respuesta esperada es:

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<refresh-nuevo>",
  "token_type": "Bearer",
  "expires_in": 600,
  "refresh_token_expires_in": 36000
}
```

Intranet guarda ambos tokens en `auth_sessions`. La cookie HTTP-only `intranet_session` contiene solamente un identificador local aleatorio y expira junto con el refresh token almacenado. No se persiste una expiracion separada del access token: su `exp` firmado determina cuando debe rotarse.

Cuando vence el access token, `AuthSessionService` bloquea la fila de la sesion con `pessimistic_write` antes de llamar a Identity Hub. La respuesta exitosa reemplaza access token, refresh token y expiracion del refresh en la misma transaccion. Si otro request esperaba el bloqueo, observa el access token nuevo y no vuelve a presentar el refresh token consumido.

## Errores y recuperacion

- `invalid_grant` durante el callback descarta el grant e inicia una autorizacion nueva.
- `invalid_grant` durante refresh elimina la sesion server-side y limpia la cookie local. La API responde el `401 Unauthorized` que ya maneja el frontend.
- Un fallo 500/503, de red o de verificacion JWKS transitoria conserva la sesion y sus credenciales. La API responde `503`; no se informa que la sesion expiro.
- Otros rechazos o respuestas invalidas del token endpoint no se convierten en expiracion local; se exponen como error de dependencia y se conserva la sesion salvo que exista una inconsistencia de identidad comprobada.
- Un access token local con firma, header o claims invalidos elimina la sesion porque ya no es una credencial confiable.
- `access_denied` redirige a la ruta de error de Intranet con `error=access_denied`; no crea sesion local ni inicia un bucle de autorizacion.

## Validacion JWT y JWKS

El JWKS se obtiene desde `IDENTITY_HUB_JWKS_URL` o, si no esta configurado, desde `IDENTITY_HUB_URL/.well-known/jwks.json`. Para cada access token Intranet exige:

- header `alg=RS256`;
- `kid` no vacio y seleccion de la llave JWKS correspondiente;
- firma RS256 valida;
- `iss` exactamente igual a `OAUTH_ISSUER`;
- `aud` exactamente igual a `OAUTH_CLIENT_ID`;
- `exp` numerico, presente y no vencido;
- `sub`, `externalKey`, `name` e `iat` con el tipo esperado.

La audiencia se valida exclusivamente con `aud`. El campo redundante `clientId` que pueda existir en el payload no participa en la validacion ni en la autorizacion.

## Sesion y logout locales

Rutas:

- `GET /api/auth/me`: devuelve el usuario shadow autenticado y sus permisos efectivos locales.
- `POST /api/auth/logout`: elimina la fila de `auth_sessions`, limpia `intranet_session` y descarta cualquier cookie de transaccion OAuth.

El logout local no depende de Identity Hub y siempre elimina la sesion de Intranet. No se llama a introspeccion ni se asume cierre federado. La sesion central de Identity Hub es independiente.

Cookies locales:

- `intranet_oauth_transaction`: identificador opaco temporal, HTTP-only, `path=/auth` y TTL de cinco minutos.
- `intranet_session`: identificador opaco de la sesion persistida, HTTP-only, `path=/` y vencimiento alineado con el refresh token.

Ambas usan `secure` segun `AUTH_COOKIE_SECURE` y `sameSite` segun `AUTH_COOKIE_SAME_SITE`, con valor por defecto `lax`. Nunca contienen tokens, `state` ni `code_verifier`.

## Usuario shadow durante login

Despues de verificar el access token, Intranet sincroniza por `externalKey` usando solo `externalKey` y `name`:

- si no existe el shadow user, lo crea y le asigna todos los roles locales configurados con `isAutoAssigned=true`;
- si ya existe, actualiza unicamente `fullName` cuando cambia;
- nunca reemplaza, elimina ni agrega roles o permisos del usuario existente;
- nunca usa `sub` como clave local;
- nunca copia roles, password, email, `mustChangePassword` ni datos de recuperacion desde el token.

Los roles autoasignables solo se consultan al crear un shadow mediante JIT. No se aplican a usuarios existentes, importados previamente ni durante inicios de sesion posteriores. Puede no existir ningun rol autoasignable; en ese caso el shadow se crea sin roles.

Intranet no mantiene un estado activo/inactivo adicional para el shadow user. Identity Hub revalida el estado del usuario, de la aplicacion y de su asignacion durante authorize, canje y refresh. La autorizacion funcional dentro de Intranet sigue dependiendo de roles y permisos locales.

## Importacion administrativa

La importacion permite asignar roles locales antes del primer login. Solo el backend de Intranet llama a Identity Hub mediante HTTP Basic con `OAUTH_CLIENT_ID` y `OAUTH_CLIENT_SECRET`.

Busqueda:

```http
GET /internal/users/assignable?term=<termino>
```

`GET /api/users/identity-candidates` devuelve los candidatos en el mismo orden y cantidad recibidos. No consulta usuarios locales para filtrarlos, aunque un candidato ya tenga shadow user. Identity Hub limita la respuesta a 20 resultados.

Confirmacion:

1. El frontend envia unicamente `externalKey` y los `roleIds` locales seleccionados a `POST /api/users/import-from-identity`; `roleIds` puede omitirse o ser `[]` para importar sin roles.
2. Intranet no acepta `fullName`, `email`, `login`, roles de Identity Hub ni otros datos de identidad enviados por el navegador.
3. El backend comprueba primero si `externalKey` ya existe localmente y, si existe, devuelve `409 Conflict` sin consultar Identity Hub.
4. Si no existe, vuelve a consultar `GET /internal/users/assignable/:externalKey` con Basic.
5. Valida en runtime `externalKey`, `fullName`, `email` y `login`, y verifica que el `externalKey` devuelto sea exactamente el solicitado.
6. Resuelve `roleIds` solo contra los roles locales de Intranet.
7. Crea el shadow user con `externalKey`, `fullName` y los roles seleccionados.
8. La restriccion unica de `users.externalKey` protege las carreras con otro import o con la creacion JIT. Una importacion que pierde la carrera devuelve `409 Conflict`.

La respuesta segura de candidatos conserva el contrato de Identity Hub:

```json
{
  "externalKey": "IDH-U-...",
  "fullName": "Nombre visible",
  "email": null,
  "login": "usuario"
}
```

Intranet obtiene email y login exclusivamente de la respuesta verificada de Identity Hub, pero no los persiste en el modelo actual. Tampoco copia credenciales, roles internos de Identity Hub, `mustChangePassword` o datos sensibles.

## Persistencia server-side en PostgreSQL

- `oauth_transactions` guarda el identificador opaco, el hash de `state`, `code_verifier`, expiracion y fecha de creacion. La fila se busca y consume por `id`; `stateHash` no necesita unicidad. `expiresAt` conserva un indice para la limpieza oportunista de registros vencidos.
- `auth_sessions` guarda el identificador opaco, referencia al shadow user, access token, refresh token, expiracion del refresh y timestamps. El logout elimina la fila y limpia la cookie.
- La creacion de una transaccion OAuth y de una sesion elimina oportunistamente registros vencidos. No se agrega un cron job.

PostgreSQL, TypeORM y estas dos entidades son la arquitectura adoptada por Intranet. Otros clientes de Identity Hub pueden cumplir el mismo contrato con otra sesion server-side o almacenamiento equivalente.

## Contratos administrativos locales

- Los candidatos contienen `externalKey`, `fullName`, `email` y `login`.
- Listar usuarios devuelve `{ users, total }`; importar y actualizar devuelven un usuario. Cada usuario contiene `id`, `externalKey`, `fullName` y roles resumidos con `id`, `name` y `description`.
- `PATCH /api/users/:id` exige `roleIds`, acepta `[]` y reemplaza la asignacion completa. Un body vacio es invalido.
- Listar roles devuelve `{ roles, total }`; crear y actualizar devuelven un rol con `id`, `name`, `description`, `isAutoAssigned` y permisos reducidos a `id`, `resource` y `action`.
- IDs duplicados o con tipo/formato invalido producen `400 Bad Request`; usuarios, roles o permisos inexistentes producen `404 Not Found`; duplicados identificados correctamente producen `409 Conflict`.

## Bootstrap del primer admin

El primer admin local se crea con un comando local:

```bash
BOOTSTRAP_ADMIN_EXTERNAL_KEY=IDH-U-... npm run bootstrap:admin
```

Este comando es bootstrap de datos locales. No crea usuarios globales en Identity Hub, no registra clientes OAuth y no asigna roles del Hub.

El comando:

- lee `BOOTSTRAP_ADMIN_EXTERNAL_KEY`;
- ejecuta `ensurePermissions()` para sembrar permisos base desde `PERMISSIONS_SEED`;
- asegura el rol local reservado `ADMIN` con todos los permisos e `isAutoAssigned=false`;
- consulta Identity Hub por el usuario asignable;
- crea el shadow user con rol `ADMIN` solo si no existe ningun admin local;
- no hace nada si ya existe al menos un `ADMIN` local;
- falla si el `externalKey` ya existe localmente sin rol `ADMIN`;
- no promueve usuarios existentes no-admin;
- no depende de endpoints HTTP publicos;
- no se mezcla con el login normal.

Si despues de sembrar permisos no existe ninguno, el bootstrap falla con error claro y no crea un rol `ADMIN` vacio. Cuando `ADMIN` ya existe, agrega permisos faltantes sin eliminar permisos asignados y fuerza `isAutoAssigned=false`. El CRUD normal no puede crear o renombrar otro rol como `ADMIN`, renombrar el rol reservado, marcarlo como autoasignable ni reemplazar manualmente sus permisos. El bootstrap sigue siendo el unico responsable de sincronizarlos.

El bootstrap no crea roles autoasignables normales. Estos se configuran desde el CRUD de roles; si no existen, los usuarios nuevos por SSO/JIT se crean sin roles y se registra un warning. Los admins posteriores se gestionan desde la UI administrativa mediante roles locales.

## Seguridad operativa

- Las llamadas al token endpoint, a los endpoints internos de usuarios y al JWKS tienen un timeout explicito de 10 segundos.
- Nunca se registran access tokens, refresh tokens, authorization codes, `state` ni `code_verifier`.
- Los roles y permisos usados por guards de Intranet son locales.
- La revocacion del acceso global a la aplicacion se gestiona en Identity Hub.

## Variables de entorno

- `IDENTITY_HUB_URL`: base publica usada para authorize, token y JWKS por defecto.
- `IDENTITY_HUB_INTERNAL_URL`: base server-to-server para `/internal/users/assignable`.
- `IDENTITY_HUB_JWKS_URL`: override opcional del JWKS.
- `OAUTH_CLIENT_ID`: identificador y audiencia esperada.
- `OAUTH_CLIENT_SECRET`: secreto disponible solo para el backend.
- `OAUTH_REDIRECT_URI`: callback exacto registrado.
- `OAUTH_ISSUER`: issuer JWT esperado.
- `INTRANET_UI_BASE_URL`: base opcional para redirects finales.
- `AUTH_COOKIE_SECURE` y `AUTH_COOKIE_SAME_SITE`: atributos de cookies opacas.
- `CORS_ORIGIN`: origen opcional del frontend cuando corre separado.
- `DB_SYNCHRONIZE`: solo `true` en desarrollo local.
- `BOOTSTRAP_ADMIN_EXTERNAL_KEY`: usado solo por `npm run bootstrap:admin`.

## Checklist manual

- `/auth/login` envia PKCE S256 y no agrega parametros fuera del contrato.
- La cookie de transaccion no contiene `state` ni `code_verifier`.
- El callback consume `state` antes del token request.
- Un callback con `state` ausente, invalido o vencido redirige a la vista local de error.
- `/oauth/token` recibe formulario `snake_case`, Basic y ningun secreto en el body.
- El navegador solo recibe `intranet_session`, nunca tokens.
- Un refresh concurrente por sesion produce una sola llamada efectiva a Identity Hub.
- `invalid_grant` elimina la sesion; un 500/503 la conserva.
- `aud` se valida contra `OAUTH_CLIENT_ID`.
- El login solo actualiza `fullName` de shadows existentes.
- Los roles `isAutoAssigned=true` se aplican una sola vez al crear un shadow por JIT.
- La busqueda de candidatos no se filtra localmente y la importacion reconsulta el candidato exacto.
