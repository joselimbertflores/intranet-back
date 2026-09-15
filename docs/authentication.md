# Autenticación de Intranet

Intranet es un cliente OAuth 2.0 confidencial de Identity Hub. Usa Authorization Code con PKCE S256 y mantiene una sesión local server-side. El navegador recibe solamente una cookie `HttpOnly` con un identificador opaco; el access token, el refresh token y el secreto del cliente permanecen en el backend.

## URLs y redirects

En la convención común, `CLIENT_PUBLIC_URL` corresponde a `INTRANET_PUBLIC_URL` y `CLIENT_UI_URL` a `INTRANET_UI_URL`.

- `CLIENT_PUBLIC_URL` es la URL canónica del backend. Expone `GET /auth/login` y `GET /auth/callback`.
- `launchUrl` normalmente es `<CLIENT_PUBLIC_URL>/auth/login`.
- `redirectUri` es `<CLIENT_PUBLIC_URL>/auth/callback` y debe estar registrado en Identity Hub.
- `CLIENT_UI_URL` es opcional para un frontend separado: define los redirects visuales y habilita CORS para ese origen con credenciales. Si se omite, se usa `CLIENT_PUBLIC_URL`.
- El destino visual final lo decide Intranet después del callback. Actualmente el éxito va a `/admin` y los errores a `/auth/error`, sobre `CLIENT_UI_URL ?? CLIENT_PUBLIC_URL`.
- `IDENTITY_HUB_PUBLIC_URL` se usa para `/oauth/authorize` y siempre como issuer (`iss`) esperado.
- `IDENTITY_HUB_INTERNAL_URL` es opcional para `/oauth/token`, JWKS y el directorio interno; si se omite, esos accesos usan `IDENTITY_HUB_PUBLIC_URL`.

## Login y sesión

`GET /auth/login` genera `state`, `code_verifier` y `code_challenge`. La transacción OAuth temporal guarda server-side el hash de `state` y el verifier; su cookie contiene sólo un ID aleatorio. En el callback, la transacción se valida y consume una sola vez, y el backend canjea el code usando PKCE y autenticación del cliente.

Tras validar el access token y sincronizar el usuario local, Intranet crea una fila en `auth_sessions`. La cookie `intranet_session` contiene sólo el ID de esa sesión; los tokens se almacenan exclusivamente en el backend.

La vigencia del access token se obtiene del claim `exp` del JWT; la sesión no guarda `accessTokenExpiresAt`. Cuando expira, el backend usa el refresh token, exige su rotación y persiste el nuevo par. El refresh se serializa por sesión mediante bloqueo de la fila para que requests concurrentes no consuman el mismo token.

Un refresh vencido o rechazado con `invalid_grant`, una sesión inexistente o una identidad que ya no coincide eliminan la sesión y producen `401`. Sólo un `401` debe iniciar una nueva autenticación. Los errores transitorios de Identity Hub, del endpoint de token o de JWKS se devuelven como errores temporales y conservan la sesión local.

`POST /api/auth/logout` elimina la sesión y las cookies locales. No cierra necesariamente la sesión SSO global que el navegador mantiene en Identity Hub.

## JWT, usuarios y autorización

Intranet valida firma `RS256`, `kid`, audience, vigencia y los claims `sub`, `externalKey` y `name`. `iss` se valida siempre contra `IDENTITY_HUB_PUBLIC_URL`, aunque JWKS se consulte mediante la URL interna.

`externalKey` es el vínculo estable con Identity Hub. En el primer login se crea el usuario JIT con los roles cuyo `isAutoAssigned` está activo. En accesos posteriores se sincroniza el nombre sin reemplazar roles ni permisos locales. La importación administrativa permite registrar previamente usuarios asignables y elegir sus roles; la autorización dentro de Intranet continúa siendo local.
