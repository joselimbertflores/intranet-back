# Organización de módulos del backend

El backend está organizado por módulos de NestJS. Los módulos de dominio son responsables de reglas y entidades del negocio; los módulos de infraestructura resuelven capacidades compartidas.

## Módulos de dominio

- `documents`: documentos institucionales, clasificación documental y estructura organizacional.
- `communications`: comunicados institucionales asociados a un PDF.
- `content`: bloques administrables del landing, como hero slides, accesos rápidos, banners y avisos.
- `tutorial`: tutoriales y sus recursos.
- `calendar`: eventos y recurrencia.
- `directory`: información del directorio institucional.

Cada módulo debe conservar sus reglas de negocio. Por ejemplo, `communications` decide cuándo un PDF queda asociado a un comunicado; `files` solo ejecuta el lifecycle técnico solicitado.

## Módulos transversales e infraestructura

- `files`: almacenamiento físico, metadata, validación de carga, servido HTTP y lifecycle técnico de archivos.
- `auth`: autenticación SSO, sesión y guards.
- `users`: usuarios shadow locales, roles y permisos.
- `portal`: controllers y servicios públicos que componen información de varios dominios.
- `common`: DTOs y utilidades compartidas de bajo nivel.

`portal` no es dueño de los datos que expone. Delega en los servicios de dominio y construye respuestas para el frontend.

## Relación con Files

`files` es infraestructura compartida por `documents`, `communications`, `content` y `tutorial`. El flujo general es:

1. Una ruta específica recibe y valida el archivo según un `FileContext`.
2. `files` guarda el archivo como `PENDING`.
3. El módulo de dominio crea o actualiza su entidad dentro de una transacción.
4. Ese módulo reclama el archivo usando el mismo contexto.
5. El archivo pasa a `ACTIVE`; un archivo reemplazado pasa a `ORPHANED`.

El módulo de dominio conserva la metadata funcional. `StoredFile` no reemplaza entidades como `DocumentRecord` o `Communication`.

Detalles adicionales:

- [Diseño del módulo Files](../modules/files.md)
- [Módulo Documents](../modules/documents.md)
- [Módulo Communications](../modules/communications.md)
- [Módulo Content](../modules/content.md)

## Criterio de dependencias

- Los módulos de dominio pueden depender de `files` para almacenar y reclamar archivos.
- `files` no debe incorporar reglas específicas de documentos, comunicados o contenido.
- Los permisos deben corresponder al recurso de dominio que realiza la operación.
- Las respuestas públicas deben mapear campos explícitamente y no serializar entidades completas por conveniencia.
