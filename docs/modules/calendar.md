# Calendar

Calendar administra eventos simples o recurrentes. La relación con `Communication` es opcional y conserva la asociación uno a uno existente.

## Recurrencia

`recurrenceConfig` es la única fuente persistida para la recurrencia. Admite las frecuencias `DAILY`, `WEEKLY`, `MONTHLY` y `YEARLY`, un `interval`, `byWeekDays` para eventos semanales y un `until` opcional. Las ocurrencias se calculan únicamente para el rango solicitado y no se almacenan por separado.

## Fechas

Los eventos usan intervalos con `endDate` exclusivo: una consulta incluye el evento cuando su intervalo se superpone con el rango solicitado.

Los eventos `allDay` se normalizan al inicio del día en la zona horaria institucional de Bolivia (`-04:00`). Sin un `endDate` explícito duran un día; con un `endDate` exclusivo pueden abarcar varios días.
