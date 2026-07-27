# Módulo Files

`FilesModule` administra archivos físicos en disco local y su metadata técnica. No representa contenido de negocio: un documento pertenece a `documents`, un comunicado a `communications` y una imagen del landing a `content`.

## StoredFile

`StoredFile` contiene:

- `id`: UUID usado para identificar y servir el archivo.
- `originalName`: nombre usado en UI y descargas.
- `mimeType` y `sizeBytes`: metadata para validación y headers HTTP.
- `storageKey`: ubicación relativa generada por el backend.
- `context`: módulo o caso de uso que puede reclamar el archivo.
- `status`: estado técnico del lifecycle.
- `kind`: archivo principal o derivado.
- `sourceFileId`: referencia al original cuando el archivo es derivado.

La ubicación física se resuelve como `UPLOAD_PATH + storageKey`. No se guardan rutas absolutas ni se usa `originalName` como nombre físico.

### storageKey y context

Los campos tienen responsabilidades distintas:

- `storageKey` indica dónde está el archivo, por ejemplo `communications/uuid.pdf`.
- `context` es metadata de negocio validable, por ejemplo `FileContext.COMMUNICATIONS`.

Aunque el prefijo de `storageKey` suele coincidir con el contexto, no es fuente de verdad para autorizar un reclamo. El servicio valida la columna `context`.

## Estados y tipos

Estados:

- `PENDING`: subido pero todavía no reclamado por una entidad padre.
- `ACTIVE`: confirmado, asociado y disponible para servir.
- `ORPHANED`: reemplazado o desvinculado; queda pendiente de limpieza futura.

Tipos relevantes:

- `ORIGINAL`: archivo principal subido por el usuario.
- `PREVIEW`: derivado generado por el sistema.

Los archivos derivados generados actualmente usan `PREVIEW`.

## Carga y reclamo

El flujo normal es:

1. Una ruta de upload valida tamaño y tipo según `FileContext`.
2. `saveFile` guarda archivo y metadata con estado `PENDING`.
3. La entidad padre se crea o actualiza dentro de una transacción TypeORM.
4. El módulo llama `claimPendingFile(fileId, context, manager)`.
5. El original y sus derivados pendientes pasan a `ACTIVE`.

`claimPendingFile` siempre reclama originales. Verifica que:

- el archivo exista;
- esté `PENDING`;
- su `context` coincida;
- tenga `kind === ORIGINAL`;
- no tenga `sourceFileId`.

Los previews no se reclaman directamente desde módulos externos.

La carga bajo `FileContext.DOCUMENT_RECORDS` requiere permiso de creación sobre el recurso `DOCUMENTS`.

## Reemplazo

`replaceActiveFileWithPendingFile(activeFileId, pendingFileId, context, manager)` ejecuta dentro de la transacción recibida:

1. Reclama el nuevo original y activa sus derivados pendientes.
2. Marca el archivo anterior y sus derivados activos como `ORPHANED`.
3. Devuelve el nuevo archivo para asociarlo a la entidad padre.

El reemplazo no borra archivos físicos.

## PDF y previews

`POST /api/files/communications` acepta únicamente PDF y está protegido con el recurso `COMMUNICATIONS`. La ruta aplica el tamaño máximo tanto en Multer como en `ParseFilePipeBuilder` y exige detección real de `application/pdf`.

Otros contextos mantienen compatibilidad con formatos ofimáticos que pueden detectarse como contenedores ZIP. Si el contenido se detecta claramente como un tipo distinto al permitido, se rechaza.

Después de guardar un PDF se intenta generar un PNG de preview como `PREVIEW` asociado mediante `sourceFileId`. El preview es opcional: si falla, se registra un warning y el PDF principal permanece `PENDING`. Los consumidores deben aceptar `previewImageUrl: null`.

## Servido HTTP

`GET /api/files/:id` sirve únicamente archivos `ACTIVE`. `?download=true` cambia `Content-Disposition` de `inline` a `attachment`. La URL se construye con `APP_PUBLIC_URL` y el ID del archivo.

## Limpieza pendiente

Todavía no existe cron/job de limpieza. Debe implementarse de forma centralizada en `files` para eliminar:

- archivos `PENDING` antiguos que nunca fueron reclamados;
- archivos `ORPHANED` después de un periodo de gracia;
- sus registros y archivos físicos de forma consistente.
