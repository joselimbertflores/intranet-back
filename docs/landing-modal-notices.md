# Avisos emergentes de la landing

## Propósito

`LandingModalNotice` representa un aviso breve que se muestra en un diálogo al ingresar a la landing de la Intranet GAM Sacaba. Su nombre visible en administración es **Avisos emergentes**.

Un aviso puede contener:

- solo contenido enriquecido;
- contenido enriquecido e imagen;
- solo imagen.

La entidad conserva título, contenido HTML sanitizado, una imagen opcional administrada por `FilesModule`, ventana opcional de visibilidad, activación, fijado y auditoría de creación/actualización.

## Diferencia con hero banners

Los hero banners forman la cabecera visual permanente de la landing y tienen orden manual. Un aviso emergente interrumpe de forma deliberada la entrada a la landing dentro de un diálogo cerrable y solo se muestra una vez por sesión del navegador.

Los avisos no usan `sortOrder`, batch ni drag-and-drop. Se ordenan por prioridad editorial simple: fijados primero y, dentro de cada grupo, los más recientes primero.

## Diferencia con comunicados documentales

Un aviso emergente no es un comunicado, instructivo, circular ni documento institucional. No tiene CITE, tipo documental, archivo PDF, adjuntos ni integración con el calendario.

Los comunicados y documentos conservan sus propios módulos y flujos. `LandingModalNotice` pertenece a `ContentModule` porque configura la experiencia de la landing.

## Visibilidad pública

El endpoint administrativo es `/api/content/landing-modal-notices` y usa el mismo recurso RBAC `CONTENT` que hero banners, accesos directos y banners destacados.

El endpoint público `/api/portal/landing` incorpora `modalNotices`. La consulta devuelve como máximo cinco avisos que cumplan:

```sql
WHERE is_active = true
  AND (visible_from IS NULL OR visible_from <= NOW())
  AND (visible_until IS NULL OR visible_until >= NOW())
ORDER BY is_pinned DESC, created_at DESC
LIMIT 5
```

`visibleFrom` y `visibleUntil` son opcionales. Si ambas existen, `visibleFrom` debe ser anterior o igual a `visibleUntil`. La respuesta pública no expone activación, ventana temporal ni usuarios de auditoría.

## Reglas de contenido

El título es obligatorio. Además, debe existir contenido enriquecido significativo o una imagen. Si existe imagen, el texto alternativo es obligatorio. La URL de la imagen es opcional y solo admite una URL externa `http(s)` o una ruta interna que comience con `/`.

El HTML se sanitiza en backend con una lista blanca específica. Se permiten:

- párrafos y saltos de línea;
- negrita y cursiva;
- listas ordenadas y no ordenadas;
- enlaces.

Se eliminan scripts, iframes, estilos inline, clases arbitrarias, imágenes embebidas, audio, video y tablas. La imagen del aviso siempre se sube por el flujo de `FilesModule`; no se inserta dentro del rich text.

## Imágenes y ausencia de adjuntos/PDF

La imagen opcional usa el ciclo existente `PENDING -> ACTIVE -> ORPHANED` de `StoredFile`. Crear, reemplazar o quitar una imagen se realiza dentro de la misma transacción que actualiza el aviso.

No hay adjuntos ni PDF porque este módulo resuelve avisos breves de entrada. Agregar documentos duplicaría los módulos documentales, introduciría navegación y previsualización ajenas al diálogo, y mezclaría contenido configurable con registros institucionales.

## Orden y carousel

El orden `isPinned DESC, createdAt DESC` evita un campo manual adicional: fijar expresa prioridad y la fecha resuelve el orden de forma determinista. No existe endpoint de reordenamiento.

Cuando hay varios avisos, el frontend usa un carousel manual. No usa autoplay porque el contenido puede requerir distintos tiempos de lectura y un cambio automático reduce accesibilidad y comprensión. Navegadores e indicadores solo aparecen cuando hay más de un aviso.

Al cerrar el diálogo, el frontend guarda una marca en `sessionStorage`. Esto evita repetirlo durante la misma sesión sin crear estado por usuario en backend.
