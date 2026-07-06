# Módulo Content y landing

`ContentModule` administra bloques editoriales del landing. Se documentan juntos porque comparten el recurso RBAC `CONTENT`, el endpoint público de landing y reglas similares de orden y activación.

## Bloques administrados

### Hero slides

Banners principales con título, descripción opcional, enlace opcional, imagen obligatoria, orden y activación. La imagen usa `FileContext.HERO_SLIDES`.

### Accesos rápidos

Enlaces destacados con título, descripción, icono, URL, orden y activación. No utilizan `StoredFile`.

### Featured banners

Banners secundarios con título, descripción y enlace opcionales, imagen obligatoria, orden y activación. La imagen usa `FileContext.FEATURED_BANNERS`.

### Landing notices

Avisos temporales que pueden contener HTML sanitizado, imagen o ambos. También admiten texto alternativo, enlace opcional, activación, ventana `visibleFrom`/`visibleUntil`, fijado y auditoría. La imagen usa `FileContext.LANDING_NOTICES`.

Un aviso debe tener contenido o imagen. Si tiene imagen, requiere `imageAlt`; si ambas fechas de visibilidad existen, la fecha inicial no puede ser posterior a la final.

El backend devuelve como máximo cinco avisos visibles, ordenados por fijado y luego por fecha de creación descendente. La forma concreta de presentarlos —por ejemplo, diálogo o carousel— pertenece al frontend.

## Archivos

Hero slides, featured banners y landing notices reclaman imágenes `PENDING` dentro de la misma transacción que crea o actualiza el contenido. Al reemplazar o quitar una imagen, la anterior pasa a `ORPHANED`; no se borra físicamente de inmediato.

El lifecycle completo se describe en [Files](files.md).

## Orden y visibilidad

Hero slides, accesos rápidos y featured banners se guardan mediante operaciones batch. La posición del item en el request determina `sortOrder`; los items omitidos no se eliminan. La eliminación usa el endpoint específico del bloque.

Las consultas administrativas incluyen activos e inactivos. El landing incluye únicamente hero slides, accesos rápidos y featured banners activos. Los avisos aplican además su ventana temporal.

## Endpoints

Administración:

- `GET /api/content/hero-slides`
- `PUT /api/content/hero-slides/batch`
- `DELETE /api/content/hero-slides/:id`
- `GET /api/content/quick-accesses`
- `PUT /api/content/quick-accesses/batch`
- `DELETE /api/content/quick-accesses/:id`
- `GET /api/content/featured-banners`
- `PUT /api/content/featured-banners/batch`
- `DELETE /api/content/featured-banners/:id`
- `GET|POST /api/content/landing-notices`
- `PATCH|DELETE /api/content/landing-notices/:id`

El portal consume `GET /api/portal/landing`, cuya respuesta compone `heroSlides`, `quickAccesses`, `featuredBanners`, `landingNotices` y `communications`.

No conviene crear un documento separado por bloque mientras estas reglas sigan siendo pequeñas y compartidas.
