# Sistema Intranet Institucional - Backend

API del sistema de **Intranet Institucional**.

## Descripción

Este sistema permite gestionar la documentación institucional, comunicados internos, directorios y tutoriales, facilitando el acceso a la información dentro de la institución.

## Funcionalidades principales

- Gestión de documentación institucional
- Publicación de comunicados internos
- Gestión de directorios institucionales
- Registro y consulta de tutoriales
- Organización y acceso a contenido institucional

## Requisitos previos

Antes de iniciar, asegúrate de tener instalado:

- Node.js
- npm
- PostgreSQL

## Instalación

```bash
npm install
```

## Configuración

Renombra el archivo `.env.template` a `.env` en la raíz del proyecto y configura las variables de entorno necesarias.

## Ejecución del proyecto

### Modo desarrollo

```bash
npm run start:dev
```

### Modo producción

```bash
npm run build
npm run start:prod
```