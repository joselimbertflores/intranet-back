# Avisos emergentes de la landing

## Dominio y propósito

`LandingNotice` representa un aviso breve publicado en la landing de la Intranet GAM Sacaba. En la interfaz se presenta como **Avisos emergentes**, pero el dominio no se llama `LandingModalNotice`: “modal” describe la presentación actual y no el contenido administrado por el backend.

Un aviso admite solo texto enriquecido, texto e imagen o solo imagen. Conserva título, contenido HTML sanitizado, una imagen opcional administrada por `FilesModule`, enlace opcional de imagen, activación, ventana de visibilidad, fijado y auditoría.

## Diferencias con otros contenidos

Los hero banners son la cabecera visual permanente de la landing, admiten orden manual y no interrumpen la navegación. Los avisos se muestran temporalmente en un diálogo cerrable al entrar a la landing.

Los comunicados documentales representan registros institucionales. Pueden tener CITE, categoría, PDF y otros metadatos documentales. Un `LandingNotice` no tiene adjuntos, PDF embebido ni integración con calendario; pertenece a `ContentModule` porque configura la experiencia de la landing.

## Endpoints y orden

El endpoint administrativo es `/api/content/landing-notices` y usa el recurso RBAC `CONTENT`. El endpoint de carga de imágenes es `/api/files/landing-notices`.

`/api/portal/landing` expone `landingNotices`. El backend devuelve como máximo cinco avisos, ordenados por `isPinned DESC, createdAt DESC`, que cumplan:

```sql
WHERE is_active = true
  AND (visible_from IS NULL OR visible_from <= NOW())
  AND (visible_until IS NULL OR visible_until >= NOW())
ORDER BY is_pinned DESC, created_at DESC
LIMIT 5
```

La tabla administrativa no pagina por ahora y la búsqueda por título es local. No existe `displayOrder`: fijar expresa prioridad editorial y la fecha de creación resuelve el resto del orden.

## Reglas de contenido y visibilidad

El título es obligatorio en backend y administración. El estado final de la entidad debe cumplir:

1. Tener `contentHtml` o `imageId`.
2. Si tiene `imageId`, tener `imageAlt`.
3. Si tiene `visibleFrom` y `visibleUntil`, `visibleFrom <= visibleUntil`.

Estas reglas se verifican en el service porque una actualización parcial depende tanto del request como del estado persistido. El DTO transforma y valida únicamente los campos recibidos.

En la landing el título se muestra para avisos con texto, tengan o no imagen. En avisos de solo imagen se oculta visualmente para no duplicar el título de un flyer, pero permanece en un `h2.sr-only` para accesibilidad.

## Rich text

`contentHtml` se sanitiza en el DTO con `sanitizeBasicRichTextHtml()`. Solo se admiten `p`, `br`, `strong`, `b`, `em`, `i`, `ul`, `ol`, `li` y `a[href]`. Se eliminan scripts, estilos, iframes, contenido multimedia, tablas, clases, estilos inline y eventos `on*`.

La sanitización solo restringe HTML. Después, el transform del DTO normaliza `&nbsp;` y caracteres `U+00A0` a espacios normales, recorta extremos y convierte HTML sin texto significativo a `null`. La normalización no pertenece al sanitizer para mantener ambas responsabilidades separadas.

El frontend renderiza el contenido sanitizado con `[innerHTML]` y las clases `prose` de `@tailwindcss/typography`; no usa otra librería de renderizado.

## Imagen y enlaces

La imagen usa el ciclo existente `PENDING -> ACTIVE -> ORPHANED` de `StoredFile`. Crear, reemplazar o quitar una imagen ocurre en la misma transacción que el aviso.

`imageLinkUrl` es la única propiedad de enlace. Admite una URL externa completa que empiece con `http://` o `https://`, o una ruta interna que empiece con un solo `/`. No admite rutas relativas sin `/`, URLs protocol-relative (`//`), `javascript:` ni `data:`. Las rutas internas usan Angular Router; las externas se abren en una pestaña nueva con `noopener,noreferrer`.

## Presentación pública

El componente público conserva un `p-dialog` declarativo y usa Swiper Element con un slide visible, navegación manual, indicador, `autoHeight` y sin autoplay. Se reemplazó `p-carousel` porque calculaba mal la altura cuando los avisos tenían contenidos heterogéneos.

El diálogo se abre 400 ms después de recibir avisos. Al cerrarlo guarda en `sessionStorage` la firma de `id + updatedAt` bajo `intranet.landingNotices.dismissed`; así no reaparece durante la sesión, salvo que cambie el conjunto publicado.

DynamicDialog se reserva para crear y editar en administración.

## Decisiones deliberadas

No se persisten `showTitle`, `type`, `displayMode` ni `displayOrder`:

- la visibilidad del título se deriva de si el aviso es solo imagen;
- texto, imagen o ambos se deducen del contenido existente;
- el modo de presentación es responsabilidad del frontend;
- el orden se resuelve con fijado y fecha.

Tampoco se agregan severidad, estado editorial, versionado, adjuntos, selector de tipo ni cierre por usuario en backend.
