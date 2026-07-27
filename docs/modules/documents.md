# Módulo Documents

`DocumentsModule` administra documentos publicables, su clasificación y su archivo.

## Clasificación

Cada documento tiene un tipo, puede tener un subtipo y puede clasificarse en una unidad organizacional.

La unidad organizacional es opcional:

- `organizationalUnitId` con un UUID asigna el documento a esa unidad.
- `organizationalUnitId: null` identifica un documento institucional o transversal, sin una unidad específica.
- En creación, omitir `organizationalUnitId` equivale a enviar `null`.
- En actualización, omitir la propiedad conserva el valor actual; enviar `null` retira la unidad.

La unidad se usa únicamente para clasificación y filtrado. No representa responsabilidad, procedencia ni alcance del documento.

## Filtro por unidad

Sin filtro de unidad, el portal devuelve todos los documentos visibles, incluidos los que no tienen unidad.

Con filtro de unidad, devuelve solamente los documentos asignados a esa unidad o a sus descendientes. Los documentos con `organizationalUnitId: null` no se incluyen en ese caso.

## Visibilidad y archivos

El portal muestra documentos activos cuyo archivo y tipo estén activos. Si existe un subtipo, también debe estar activo.

Los archivos se suben primero como `PENDING`. Al crear un documento se activan dentro de la transacción. Al reemplazar un archivo, el nuevo se activa y el anterior pasa a `ORPHANED`.

## Endpoints principales

Administración:

- `GET /api/documents`
- `POST /api/documents/batch`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id`

Portal:

- `GET /api/portal-documents/filters`
- `GET /api/portal-documents`
- `GET /api/portal-documents/:id/file`
