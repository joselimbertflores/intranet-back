# Módulo Tutorials

`TutorialModule` administra tutoriales institucionales mediante una cabecera, una categoría opcional y una lista ordenada de bloques. La API administrativa edita cada bloque individualmente y la API pública expone únicamente tutoriales publicados.

## Modelo

- `Tutorial`: título, slug público estable, resumen opcional, categoría opcional, `isPublished` y fechas.
- `TutorialCategory`: nombre y slug.
- `TutorialBlock`: tipo, contenido o archivo, y posición dentro del tutorial.

`isPublished=false` significa que el tutorial no es visible públicamente. `isPublished=true` lo hace visible. Un tutorial no puede publicarse sin al menos un bloque.

Tipos de bloque:

- `TEXT`: HTML enriquecido sanitizado.
- `YOUTUBE`: video de YouTube almacenado en formato normalizado.
- `IMAGE`: JPEG, PNG o WebP.
- `VIDEO_FILE`: MP4.
- `FILE`: PDF o PPTX.

Cada bloque acepta exclusivamente contenido o archivo según su tipo. El tipo no puede cambiarse; para sustituirlo se elimina el bloque y se crea otro.

## Archivos

Los archivos se cargan mediante `POST /api/files/tutorials`, con permiso sobre `TUTORIALS` y un máximo de 50 MiB. Se guardan inicialmente como pendientes bajo `FileContext.TUTORIALS`.

Tutoriales delega el lifecycle técnico en `FilesService`:

- `claimPendingFile` al crear un bloque con archivo;
- `replaceActiveFileWithPendingFile` al reemplazarlo;
- `markActiveFileAsOrphaned` al eliminar un bloque o tutorial.

El módulo no borra archivos físicos. La limpieza de archivos pendientes o huérfanos es responsabilidad global de `FilesModule`.

## API administrativa

- `GET /api/tutorials`
- `GET /api/tutorials/:id`
- `POST /api/tutorials`
- `PATCH /api/tutorials/:id`
- `DELETE /api/tutorials/:id`
- `POST /api/tutorials/:tutorialId/block`
- `PATCH /api/tutorials/block/:id`
- `DELETE /api/tutorials/block/:id`
- `PUT /api/tutorials/:id/blocks/order`
- CRUD bajo `/api/tutorial-categories`

El reordenamiento recibe la secuencia completa y sin duplicados:

```json
{
  "blockIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

La eliminación de tutoriales y bloques responde `204 No Content`. Los archivos asociados pasan a huérfanos dentro de la misma transacción de base de datos.

## API pública

- `GET /api/portal-tutorials`
- `GET /api/portal-tutorials/:slug`
- `GET /api/portal-tutorials/categories`

El listado admite paginación, búsqueda por título y filtro por slug de categoría:

```http
GET /api/portal-tutorials?category=sistemas-institucionales
```

Las categorías públicas se ordenan por nombre y solo incluyen categorías con al menos un tutorial publicado. El listado y el detalle devuelven la categoría con `id`, `name` y `slug`, o `null` cuando no existe.
