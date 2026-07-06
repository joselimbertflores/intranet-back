# Módulo Communications

`CommunicationsModule` administra comunicados institucionales. Cada comunicado tiene referencia, código único normalizado, tipo, estado de activación, fecha de creación y un PDF principal gestionado por `FilesModule`.

## Flujo de publicación

1. Un administrador sube el PDF mediante `POST /api/files/communications`.
2. El archivo se guarda con `FileContext.COMMUNICATIONS`, `kind = ORIGINAL` y estado `PENDING`.
3. El backend intenta generar un preview PNG derivado. Su ausencia no invalida el PDF.
4. El administrador crea el comunicado enviando `fileId` a `POST /api/communications`.
5. `CommunicationService` reclama el archivo con `claimPendingFile(fileId, FileContext.COMMUNICATIONS, manager)`.
6. PDF y preview pendiente pasan a `ACTIVE` dentro de la misma transacción que crea el comunicado.
7. El landing y el listado público muestran cards con `previewImageUrl`.
8. Si no hay preview, `previewImageUrl` es `null` y el frontend debe usar un fallback.
9. El detalle público expone las URLs para visualizar o descargar el PDF.

## Actualización y reemplazo del PDF

`PATCH /api/communications/:id` permite actualizar los datos del comunicado. Si recibe un `fileId` distinto:

- el nuevo PDF debe ser un original `PENDING` del contexto `COMMUNICATIONS`;
- el nuevo PDF y sus derivados pasan a `ACTIVE`;
- el PDF anterior y sus derivados pasan a `ORPHANED`;
- el comunicado se asocia al nuevo archivo dentro de la misma transacción;
- no se realiza borrado físico inmediato.

## Visibilidad

No existe `DELETE /api/communications/:id`. La visibilidad se gestiona con:

```txt
PATCH /api/communications/:id/status
```

El body contiene `isActive`. Las consultas públicas devuelven únicamente comunicados activos. Esta operación pertenece al recurso RBAC `COMMUNICATIONS`, no a `CALENDAR`.

## Respuestas públicas

La card/listado público mapea explícitamente:

- `id`
- `reference`
- `code`
- `type`
- `createdAt`
- `previewImageUrl: string | null`

No se serializa la entidad mediante spread, para evitar exponer `isActive`, relaciones o metadata interna al agregar campos futuros.

El detalle añade un `attachment` con:

- `fileName`
- `mimeType`
- `sizeBytes`
- `fileUrl`
- `downloadUrl`

## Endpoints

Administración, protegida por `COMMUNICATIONS`:

- `GET /api/communications`
- `POST /api/communications`
- `PATCH /api/communications/:id`
- `PATCH /api/communications/:id/status`
- `GET /api/communications/types`
- `POST /api/files/communications`

Portal público:

- `GET /api/portal/communications`
- `GET /api/portal/communications/:id`
- `GET /api/portal/communications/types`
- `GET /api/portal/landing`, que incluye los comunicados recientes para el carousel.

Los endpoints administrativos pueden devolver datos de gestión; los endpoints públicos deben limitarse al contrato anterior.
