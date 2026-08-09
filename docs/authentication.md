# Autenticación de Intranet

Intranet Backend es un cliente OAuth 2.0 confidencial de Identity Hub. Identity Hub autentica al usuario y controla su acceso global a la aplicación; Intranet mantiene el usuario proyectado, la autorización y la sesión local. El navegador recibe únicamente cookies `HttpOnly` con identificadores opacos, nunca los tokens ni el secreto del cliente.

## Login y callback

1. `GET /auth/login` genera `state`, un `code_verifier` y su challenge PKCE S256.
2. Intranet guarda durante cinco minutos una transacción en `oauth_transactions` con el hash de `state` y el verifier. La cookie `intranet_oauth_transaction`, limitada a `/auth`, contiene solo el ID aleatorio de esa transacción.
3. El navegador se redirige a Identity Hub `/oauth/authorize` con el client ID, el callback derivado de `INTRANET_PUBLIC_URL` y los parámetros de PKCE.
4. Identity Hub vuelve a `GET /auth/callback` con `code` y `state`. Intranet valida y consume la transacción de forma atómica y de un solo uso.
5. El backend canjea el code en `/oauth/token` mediante HTTP Basic, enviando el `code_verifier` original.
6. Tras validar el access token, sincroniza el shadow user, crea la sesión persistida y redirige al frontend. Los callbacks rechazados vuelven a la ruta local de error; un `invalid_grant` durante el canje reinicia la autorización.

## Sesión, refresh y logout

`auth_sessions` guarda un ID aleatorio, el usuario local, los tokens emitidos por Identity Hub y la expiración del refresh token. La cookie `intranet_session` contiene únicamente el ID de la sesión y vence junto con el refresh.

El guard global carga la sesión y el usuario con sus roles y permisos. Si el access token expiró, renueva y persiste los tokens server-side; el refresh se serializa por sesión para manejar requests concurrentes. Un refresh vencido o rechazado con `invalid_grant` elimina la sesión y exige una nueva autorización. Los errores transitorios de Identity Hub o JWKS no eliminan una sesión válida.

`POST /api/auth/logout` elimina la sesión y limpia las cookies locales, incluida cualquier transacción OAuth pendiente. No cierra la sesión global de Identity Hub.

## JWT y JWKS

Intranet valida los access tokens con el JWKS publicado por Identity Hub. Comprueba `RS256`, `kid`, firma, issuer, audience, vigencia temporal y los claims `sub`, `externalKey` y `name`. El `externalKey` también debe coincidir con el usuario asociado a la sesión.

## Shadow users y autorización local

`externalKey` es el vínculo estable con Identity Hub. En el primer login se crea el shadow user con los roles configurados como autoasignables; en logins posteriores solo se sincroniza el nombre y se conservan los roles y permisos locales. La importación administrativa permite registrar anticipadamente usuarios asignables y elegir sus roles.

Identity Hub decide si el usuario puede acceder a Intranet. Dentro de la aplicación, Intranet autoriza localmente mediante roles y permisos por recurso y acción; esos permisos no provienen del token.

## Configuración relevante

- `INTRANET_PUBLIC_URL`: URL pública del backend, usada para derivar `/auth/callback`.
- `INTRANET_UI_URL`: URL opcional del frontend para redirects y CORS.
- `IDENTITY_HUB_PUBLIC_URL`: base pública de authorize, token, issuer y JWKS.
- `IDENTITY_HUB_INTERNAL_URL`: base opcional para consultas administrativas server-to-server.
- `OAUTH_CLIENT_ID` y `OAUTH_CLIENT_SECRET`: credenciales del cliente confidencial.
- `AUTH_COOKIE_SECURE` y `AUTH_COOKIE_SAME_SITE`: política de las cookies locales.
- `BOOTSTRAP_ADMIN_EXTERNAL_KEY`: identificador usado únicamente para crear el primer administrador.

`.env.template` es la referencia completa de configuración. Identity Hub debe registrar el callback `/auth/callback` resuelto sobre `INTRANET_PUBLIC_URL`.
