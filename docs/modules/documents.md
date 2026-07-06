# Módulo Documents

`DocumentModule` administra documentos publicables de la intranet. El modelo separa clasificación documental, unidad institucional, gestión y archivo; no reproduce una navegación por carpetas.

## Modelo

- `DocumentRecord`: registro administrable y publicable.
- `DocumentType`: clase general del documento.
- `DocumentSubtype`: variante opcional perteneciente a un tipo.
- `OrganizationalUnit`: unidad de la estructura institucional.
- `StoredFile`: archivo principal administrado por `FilesModule`.

`DocumentRecord` contiene actualmente `title`, `year`, `downloadCount`, relaciones con tipo, subtipo, unidad y archivo, `status`, creador y fechas de auditoría. No existe `referenceCode` ni un campo `fiscalYear`; la gestión opcional se llama `year`.

## Clasificación

Un documento pertenece a:

- un `DocumentType` obligatorio;
- un `DocumentSubtype` opcional y válido para ese tipo;
- una única `OrganizationalUnit` obligatoria.

`OrganizationalUnit` forma un árbol mediante `parentId`. Representa dependencias institucionales reales, no carpetas como “Formularios 2026”. Un documento transversal debe asignarse a la unidad responsable o a una unidad general definida para ese propósito, no a múltiples unidades.

`year` es opcional y representa la gestión asociada al contenido cuando corresponde. `createdAt` y `updatedAt` son fechas de auditoría, no sustituyen esa gestión.

## Estados y visibilidad

`DocumentRecord.status` usa estados simples:

- `ACTIVE`: disponible en consultas públicas.
- `INACTIVE`: disponible para administración, pero no para el portal.

Tipos, subtipos y unidades usan `isActive` para indicar disponibilidad. La consulta pública exige:

- documento `ACTIVE`;
- archivo `ACTIVE`;
- tipo activo;
- subtipo activo cuando existe.

Una unidad inactiva no oculta automáticamente documentos históricos activos.

## Archivos

El archivo se sube bajo `FileContext.DOCUMENT_RECORDS` y queda `PENDING`. Al crear el registro, `DocumentService` lo reclama dentro de la transacción y lo convierte en `ACTIVE`.

Si se reemplaza el archivo durante una actualización, el nuevo archivo se reclama y el anterior pasa a `ORPHANED`. El lifecycle técnico se documenta en [Files](files.md).

## Creación, edición y consultas

La creación administrativa es batch: varios documentos pueden compartir tipo, subtipo, unidad y año, pero cada item tiene su propio `fileId` y título. No se aceptan archivos duplicados dentro del mismo batch.

Endpoints administrativos principales:

- `GET /api/documents`
- `POST /api/documents/batch`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id`
- `GET /api/documents/types`
- `GET /api/documents/organizational-units/tree`

La lista administrativa permite paginación y filtros por término en título, unidad, tipo, subtipo, año y estado.

El portal usa:

- `GET /api/portal-documents/filters`
- `GET /api/portal-documents`

La búsqueda pública acepta término en título, slugs de unidad/tipo/subtipo, año, límite y offset. Cuando se filtra por unidad, incluye sus descendientes. La respuesta expone metadata del documento y URL del archivo activo.
