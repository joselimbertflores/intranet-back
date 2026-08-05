# Autenticación con Identity Hub

## Responsabilidades

Identity Hub autentica al usuario y valida que el usuario, la aplicación y su asignación estén activos. La Intranet es un cliente OAuth confidencial y conserva:

- un usuario local vinculado por `externalKey`;
- roles y permisos propios;
- la sesión local y los tokens OAuth.

Angular nunca recibe access tokens, refresh tokens, el secreto del cliente, `state` ni el `codeVerifier`. El navegador conserva únicamente cookies `HttpOnly` con identificadores opacos.

## Authorization Code con PKCE

`GET /auth/login` genera un `state` aleatorio y un `codeVerifier` PKCE, calcula el challenge S256 y crea un `OAuthTransaction` con cinco minutos de vigencia. La entidad guarda el hash de `state` y el verifier; la cookie `intranet_oauth_transaction` contiene solo el ID aleatorio de la transacción y usa `path=/auth`.

El navegador se redirige a `/oauth/authorize` en `IDENTITY_HUB_PUBLIC_URL` con `response_type=code`, `client_id`, el callback derivado de `INTRANET_PUBLIC_URL`, `state`, `code_challenge` y `code_challenge_method=S256`.

En el callback, la Intranet exige la cookie de transacción y `state`. La fila se bloquea, se comprueba su vigencia y se elimina tanto si el estado coincide como si no; por eso el intento es de un solo uso. Un estado ausente, vencido, distinto o reutilizado termina en el error local `invalid_state`. `access_denied` también se procesa solo después de consumir una transacción válida y no provoca un bucle de login.

Con un code válido, el backend llama a `/oauth/token` con formulario URL-encoded, HTTP Basic y el `codeVerifier` original. El secreto y el code canjeado no pasan por Angular.

## Validación y sesión local

Cada access token se valida con el JWKS publicado en `IDENTITY_HUB_PUBLIC_URL/.well-known/jwks.json`. La Intranet exige:

- header con `alg=RS256` y `kid` no vacío;
- clave JWKS correspondiente, firma válida y `exp` vigente;
- `iss` exactamente igual a `IDENTITY_HUB_PUBLIC_URL`;
- `aud` exactamente igual a `OAUTH_CLIENT_ID`;
- claims de identidad `sub`, `externalKey`, `name` e `iat` con el tipo esperado.

No existe compatibilidad con un issuer histórico. `externalKey`, no `sub`, es el vínculo estable con el usuario local. En un primer login se crea el usuario con los roles marcados `isAutoAssigned`; en logins posteriores solo se actualiza `fullName`. Los roles y permisos existentes nunca se reemplazan desde el token.

`AuthSession` guarda el ID opaco, usuario local, access token, refresh token y vencimiento del refresh token. La cookie `intranet_session` contiene solo el ID y vence junto con el refresh. El guard carga el usuario con sus roles y permisos locales; ningún token OAuth se serializa hacia el navegador.

## Refresh, revocación y errores

Cuando `exp` vence, la fila de sesión se bloquea con `pessimistic_write` antes del refresh. El primer request rota ambos tokens y actualiza su expiración en la misma transacción. Los requests concurrentes que esperaban el bloqueo detectan el access token nuevo y no reutilizan el refresh token consumido.

Un `invalid_grant` durante refresh elimina la sesión y exige una autorización nueva. Los fallos de red, del Hub o del JWKS se tratan como transitorios y no borran credenciales válidas sin evidencia. Un token almacenado con firma, header, issuer, audience o claims inválidos sí invalida la sesión local.

Si un usuario se desactiva, pierde la asignación o la aplicación se desactiva, Identity Hub rechaza nuevos authorize, canjes y refresh. Un access token ya emitido puede seguir siendo válido hasta su `exp`; al intentar refrescar, la Intranet elimina la sesión por `invalid_grant`.

## Logout

`POST /api/auth/logout` elimina `AuthSession` y limpia las cookies locales, incluida cualquier transacción OAuth pendiente. No llama al logout central. Cerrar la sesión de la Intranet no cierra la sesión SSO de Identity Hub, y cerrar la sesión central no elimina automáticamente una sesión local ya creada.

## Importación administrativa

La administración puede buscar usuarios asignables y confirmar una importación por `externalKey`. Solo el backend consulta `/internal/users/assignable` con Basic Auth del cliente; si `IDENTITY_HUB_INTERNAL_URL` no está configurada, usa la URL pública del Hub.

Al confirmar, la Intranet vuelve a consultar el candidato exacto, comprueba que siga activo y asignado, valida el `externalKey` devuelto y crea el usuario con los roles locales elegidos. No confía en nombre, correo, login o roles enviados por Angular. La restricción única de `users.externalKey` resuelve carreras con otro import o con la creación durante un callback.

## Limpieza

Al crear una transacción se eliminan transacciones vencidas; al crear una sesión se eliminan sesiones cuyo refresh ya venció. Además, el acceso y el logout eliminan su propio registro cuando corresponde. Esta limpieza oportunista mantiene el diseño simple y evita agregar Redis o un scheduler para este flujo.
