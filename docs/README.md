# Documentación técnica

Esta carpeta contiene documentación práctica del backend de la Intranet del Gobierno Autónomo Municipal de Sacaba. Los documentos describen el comportamiento implementado; las propuestas futuras deben señalarse explícitamente como pendientes.

## Índice

### Arquitectura

- [Organización de módulos del backend](architecture/backend-modules.md)
- [Integración SSO con Identity Hub](sso-client-integration.md)

### Módulos

- [Documents](modules/documents.md)
- [Files](modules/files.md)
- [Communications](modules/communications.md)
- [Content y landing](modules/content.md)

## Criterios de mantenimiento

- Documentar por módulo o decisión arquitectónica, no por componente pequeño.
- Evitar repetir modelos y flujos ya explicados en otro documento; usar enlaces relativos.
- Confirmar nombres de entidades, campos, rutas y estados contra el código antes de actualizarlos.
- No describir como implementadas funciones futuras, migraciones pendientes o comportamientos exclusivos del frontend.
- Actualizar estos documentos junto con cambios que alteren contratos HTTP, estados o relaciones entre módulos.
