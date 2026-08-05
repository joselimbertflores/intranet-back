# Arquitectura y módulos

## Límite del sistema

La Intranet es responsable del contenido institucional y de la autorización dentro de la aplicación. Identity Hub autentica personas y decide si un usuario activo está asignado al cliente, pero no administra los roles, permisos, datos ni sesiones locales de la Intranet.

El backend expone APIs administrativas bajo `/api` y compone las respuestas públicas del portal. En producción puede servir el build de Angular desde `public/browser`; `/auth/login` y `/auth/callback` quedan fuera del prefijo porque participan en redirects de navegador.

## Decisiones de módulos

- `auth` implementa el cliente OAuth, la sesión local y el guard global.
- `users` conserva el usuario vinculado por `externalKey`, junto con roles y permisos locales. También contiene la importación administrativa desde el directorio del Hub.
- `portal` solo compone vistas públicas; los datos siguen perteneciendo a sus módulos de dominio.
- `documents`, `communications`, `portal-content`, `calendar`, `directory` y `tutorial` contienen sus reglas funcionales. No deben moverlas a `portal` o `files` por conveniencia.
- `files` administra almacenamiento, metadatos y el ciclo técnico `PENDING → ACTIVE → ORPHANED`. El módulo de dominio decide cuándo un archivo se reclama o se reemplaza.

Los endpoints públicos deben mapear respuestas de forma explícita. Las entidades de persistencia no son contratos HTTP.

Algunas reglas funcionales merecen quedar registradas porque cruzan módulos o no se deducen de una ruta:

- Los documentos pueden ser institucionales, sin unidad organizacional; su vigencia actual o histórica se define manualmente.
- Comunicados, documentos, tutoriales y contenido visual reclaman archivos pendientes dentro de sus transacciones. Los reemplazados quedan huérfanos para una limpieza posterior, no se borran de inmediato.
- El preview de un PDF es derivado y opcional; un fallo al generarlo no invalida el archivo original.
- Las ocurrencias recurrentes del calendario se calculan para el rango consultado y no se persisten. El final de un evento es exclusivo y los eventos de día completo usan la zona horaria de Bolivia (`-04:00`).
- Un tutorial publicado debe tener bloques; su orden forma parte del contenido.

## Configuración y persistencia

La configuración se valida al arrancar mediante Joi y se consume con `ConfigService` tipado. Las URLs públicas son fuentes de verdad: de la URL pública de la Intranet se derivan el callback OAuth y las URLs de archivos; de la URL pública de Identity Hub se derivan el issuer esperado y el JWKS.

PostgreSQL almacena tanto los datos funcionales como las transacciones OAuth y sesiones locales. La limpieza de transacciones y sesiones vencidas es oportunista al crear nuevos registros; no existe un cron dedicado. TypeORM `synchronize` solo es apropiado para desarrollo local.
