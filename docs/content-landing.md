# Landing content

El modulo `content` administra dos bloques de la landing: hero slides y accesos rapidos.

## Hero slides

Los hero slides son los banners principales de la landing. Cada slide tiene titulo, descripcion opcional, texto y URL opcionales para un enlace, una imagen obligatoria asociada a un `StoredFile`, `sortOrder` e `isActive`.

La imagen se referencia con `fileId`. Al crear un hero slide, el archivo recibido debe estar `PENDING` y se reclama mediante `FilesService`. Al reemplazar la imagen de un slide existente, el nuevo archivo tambien debe estar `PENDING`; el archivo anterior queda liberado mediante la logica de archivos. Si el `fileId` enviado es igual al actual, no se toca el archivo.

## Accesos rapidos

Los accesos rapidos son enlaces destacados para navegar a secciones frecuentes. Cada item tiene titulo, descripcion opcional, icono opcional, `linkUrl`, `sortOrder` e `isActive`.

`linkUrl` acepta URLs absolutas `http(s)` y rutas internas como `/documents`.

## Guardado batch

Hero slides y accesos rapidos se guardan con endpoints batch:

- Los items con `id` actualizan registros existentes.
- Los items sin `id` crean registros nuevos.
- El backend calcula `sortOrder` usando la posicion de cada item en el array recibido.
- Los registros ausentes del array no se eliminan.
- La eliminacion se hace solo con su endpoint `DELETE`.
- Cada guardado batch se ejecuta dentro de una transaccion.

## Ordenamiento

No existe una ruta separada para ordenar. Para reordenar, el cliente envia el array en el orden deseado al endpoint batch. El primer item recibe `sortOrder = 0`, el segundo `sortOrder = 1` y asi sucesivamente.

Los endpoints admin devuelven activos e inactivos ordenados por `sortOrder ASC`. La landing devuelve solo activos, tambien ordenados por `sortOrder ASC`.

## Endpoints

Admin:

- `GET /content/admin/hero-slides`
- `PUT /content/admin/hero-slides/batch`
- `DELETE /content/admin/hero-slides/:id`
- `GET /content/admin/quick-accesses`
- `PUT /content/admin/quick-accesses/batch`
- `DELETE /content/admin/quick-accesses/:id`

Landing:

- `GET /content/landing`

Respuesta de landing:

```ts
{
  heroSlides: [],
  quickAccesses: []
}
```

## Fuera de alcance

Por ahora no se implementan versionado, publicacion programada, auditoria avanzada, soft delete ni estados complejos.
