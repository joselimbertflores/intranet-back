# Modulo Documents

## Proposito

El modulo Documents administra documentos publicables de la intranet institucional del Gobierno Autonomo Municipal de Sacaba. Su objetivo es clasificar documentos de forma clara, consultable y mantenible sin reproducir la navegacion por carpetas del sistema anterior en Joomla.

## Problema del modelo anterior

El sistema anterior organizaba documentos como carpetas anidadas. En esa estructura se mezclaban tipo documental, unidad institucional, gestion/anio y temas. Esa mezcla hacia dificil encontrar documentos, mantener criterios consistentes y evolucionar la intranet sin duplicar carpetas o crear rutas ambiguas.

El nuevo modelo separa las responsabilidades: la estructura institucional no es una carpeta, el tipo documental no es una unidad, y la gestion no reemplaza a la fecha de publicacion.

## Modelo conceptual

El modulo se basa en estas entidades:

- `DocumentRecord`: documento publicable asociado a un archivo.
- `DocumentType`: clase general del documento.
- `DocumentSubtype`: variante documental dentro de un tipo.
- `OrganizationalUnit`: unidad real de la estructura institucional.
- `StoredFile`: archivo fisico/almacenado que respalda el documento.

## Responsabilidades

`DocumentRecord` representa el documento que se muestra o administra. Sus campos principales son `id`, `title`, `documentTypeId`, `documentSubtypeId` nullable, `organizationalUnitId`, `fiscalYear` nullable, `status`, `fileId`, `createdAt` y `updatedAt`.

`DocumentType` responde que clase de documento es. Ejemplos: Manual, Formulario, Normativa, Comunicado, Organigrama, Tutorial, Convocatoria, Plantilla.

`DocumentSubtype` responde que variante documental es dentro del tipo. Ejemplos: Manual de Procedimientos, Manual de Organizacion y Funciones, Solicitud de Vacacion, Plantilla de Informe.

`OrganizationalUnit` representa la estructura institucional real: GAM Sacaba, nivel central, distritos, subalcaldias, secretarias, direcciones, jefaturas, unidades y otras dependencias reales. Es un arbol flexible mediante `parentId`; no usa `level` ni `unitType` en v1.

`StoredFile` mantiene el archivo y su estado operativo. Un documento visible requiere archivo activo.

## Reglas Principales

Un documento pertenece a una sola unidad organizacional. Si el documento es general o transversal, se asocia a una unidad raiz/general como "GAM Sacaba", no a multiples unidades.

`OrganizationalUnit` no es navegacion visual. No debe usarse para recrear carpetas como "Formularios 2026" o "RRHH/Manuales". La UI puede construir filtros o vistas con estos datos, pero la entidad representa dependencias institucionales reales.

Se usa `DocumentType + DocumentSubtype` porque separa la clase documental de su variante. No se usa una entidad jerarquica generica `DocumentCategory`, ya que eso permitiria volver al desorden de carpetas donde se mezclan unidades, anios, temas y tipos.

`fiscalYear` es opcional porque no todos los documentos pertenecen a una gestion. `fiscalYear` indica la gestion asociada al contenido cuando aplica; las fechas de auditoria indican cuando se crea o actualiza el registro.

## Estados y Activacion

`DocumentRecord` usa `status` porque es contenido publicable:

- `ACTIVE`: visible para usuarios de la intranet.
- `INACTIVE`: existe en administracion, pero no se muestra al usuario final.

Los catalogos usan `isActive`:

- `DocumentType.isActive`
- `DocumentSubtype.isActive`
- `OrganizationalUnit.isActive`

Los catalogos no necesitan flujo de estados; solo indican si estan disponibles para nuevos registros o filtros.

Un documento se muestra en consultas publicas/intranet solo si:

- `document.status = ACTIVE`
- `file.status = ACTIVE`
- `documentType.isActive = true`
- `documentSubtype.isActive = true`, si existe subtipo

`OrganizationalUnit.isActive` no oculta necesariamente documentos existentes. Una unidad inactiva significa que ya no deberia usarse para nuevos documentos, pero sus documentos activos pueden seguir apareciendo.

## Fuera de v1

No se implementan en v1:

- tags
- versionado documental formal
- permisos por area o rol
- historico formal de `OrganizationalUnit`
- navegacion tipo carpetas
- relacion muchos-a-muchos entre documentos y unidades
- `DocumentCategory` jerarquico
- estado `DRAFT`

## Ejemplos

Ejemplo correcto:

Documento: "MPyP Activos Fijos.pdf"

- `documentType`: Manual
- `documentSubtype`: Manual de Procedimientos
- `organizationalUnit`: Direccion de Finanzas
- `fiscalYear`: 2026

Ejemplo correcto:

Documento: "Formulario de Solicitud de Vacacion"

- `documentType`: Formulario
- `documentSubtype`: Solicitud de Vacacion
- `organizationalUnit`: Direccion de Recursos Humanos
- `fiscalYear`: null

Ejemplo incorrecto:

- `documentSubtype`: "Formulario RRHH 2026"

Correccion:

- `documentType`: Formulario
- `documentSubtype`: Solicitud de Vacacion
- `organizationalUnit`: Direccion de Recursos Humanos
- `fiscalYear`: 2026, solo si la gestion aplica al contenido

Ejemplo incorrecto:

- `organizationalUnit`: "Manuales/Finanzas/2026"

Correccion:

- `documentType`: Manual
- `documentSubtype`: Manual de Procedimientos
- `organizationalUnit`: Direccion de Finanzas
- `fiscalYear`: 2026, si corresponde

Ejemplo incorrecto:

- Asociar el mismo documento a Direccion de Finanzas, Recursos Humanos y GAM Sacaba.

Correccion:

- Asociar el documento a la unidad responsable principal o a la unidad raiz/general "GAM Sacaba" si es transversal.
