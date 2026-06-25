# FilesModule

`FilesModule` administra archivos fisicos guardados en disco local y su metadata tecnica en `StoredFile`. No representa el contenido publicable de negocio: por ejemplo, un documento publicado sigue siendo responsabilidad del modulo Documents.

## StoredFile

`StoredFile` describe como encontrar y servir un archivo:

- `originalName`: nombre original subido por el usuario. Se usa para UI y como nombre sugerido en descargas.
- `storageKey`: clave logica relativa al storage base. No es una ruta absoluta y siempre la genera el backend.
- `mimeType`: tipo MIME usado para el header `Content-Type`.
- `sizeBytes`: tamanio del archivo en bytes, usado para `Content-Length`.
- `status`: estado tecnico del archivo.

El archivo fisico se resuelve con:

```txt
UPLOAD_PATH + storageKey
```

Ejemplo:

```txt
UPLOAD_PATH=storage/uploads
storageKey=document-records/uuid.jpg
path final=storage/uploads/document-records/uuid.jpg
```

No se guarda una ruta absoluta en base de datos porque el directorio base puede cambiar entre desarrollo, pruebas y produccion. La base viene de `.env`; la base de datos solo conserva la clave portable.

No se usa `originalName` como nombre fisico porque viene del usuario: puede repetirse, cambiar, traer caracteres incomodos para filesystem o revelar informacion innecesaria. El backend genera `storageKey` con contexto y UUID.

Los archivos se agrupan por contexto, por ejemplo:

- `document-records`
- `communications`
- `banners`
- `tutorials`
- otros contextos definidos por el sistema

`storageKey` no debe recibirse desde DTOs ni desde el usuario.

## Estados

- `PENDING`: subido, pero aun no reclamado por una entidad de negocio.
- `ACTIVE`: asociado a una entidad de negocio y disponible para servir.
- `ORPHANED`: reemplazado o desvinculado, elegible para limpieza futura.

`GET /api/files/:id` solo debe servir archivos `ACTIVE`. Archivos `PENDING` y `ORPHANED` no deben servirse.

## URL publica

El endpoint publico de archivos usa `StoredFile.id`, no `DocumentRecord.id`:

```txt
GET /api/files/:id
GET /api/files/:id?download=true
```

`FilesService.buildPublicFileUrl(fileId)` construye una URL absoluta con `APP_PUBLIC_URL` y `/api/files/:id`.

Ejemplo en desarrollo:

```txt
APP_PUBLIC_URL=http://localhost:8100
fileId=7c6f...
url=http://localhost:8100/api/files/7c6f...
```

El frontend puede agregar `?download=true` cuando quiera forzar descarga. No hace falta exponer una segunda URL casi igual.

## Servido HTTP

El controller recibe `id` y `download`, setea headers y devuelve `StreamableFile`. El service busca el `StoredFile` activo, resuelve el path fisico, verifica existencia y crea el stream.

Headers esperados:

- `Content-Type`: `mimeType`
- `Content-Length`: `sizeBytes`
- `Content-Disposition`: `inline` o `attachment` segun `download=true`, usando `originalName` como nombre sugerido
- `Cache-Control`: `no-cache`

`Content-Disposition` aplica a cualquier tipo de archivo, no solo PDF.

La subida de archivos sigue protegida. Solo el `GET /api/files/:id` es publico; acciones administrativas como subir archivos, crear documentos o editar documentos requieren autenticacion y permisos del modulo correspondiente.
