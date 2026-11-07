# Cambios

## 0.6.7 — 2026-11-07
- Ocultación inmediata de chats eliminados y recálculo de contadores de todas las carpetas.
- Desasignación de carpeta y limpieza de vista previa.
- Tombstone por ID evita reaparición tras importación o resincronización.
- Se elimina la etiqueta «experimental» tras comprobar un borrado real, conservando la advertencia sobre API interna.

## 0.6.6 — 2026-11-07
- Por defecto se propone la vía por ID para cuentas vinculadas; sigue requiriendo consentimiento específico.
- Verificación por ID independiente de título, barra lateral y menú visual.
- Resultado de preflight visible dentro del diálogo.

## 0.6.5 — 2026-11-07
- Menú `···` en cada carpeta y subcarpeta: renombrar, crear subcarpeta, eliminar.
- Árbol jerárquico con expansión/contracción y rutas completas al mover chats.
- Eliminación local de una rama completa con aviso del número de subcarpetas y chats afectados.
- El borrado de carpetas desvincula los chats del árbol pero **no elimina chats de ChatGPT ni sus mensajes locales**.
- Mantiene los IDs de carpetas existentes; carpetas sin `parentId` siguen como raíces.
- Prueba `tests/test_folders065.js` de jerarquía, nombres duplicados, totales y ciclos.
- Motor de borrado remoto sin cambios; método visual aún no validado.

## 0.6.4 — 2026-11-07
- Identidad del chat exclusivamente por UUID, independiente de cambios en el título.
- Método de eliminación experimental de sesión web, opcional y separado del método visual.
- Verificación de huella de cuenta y respuesta del ID antes de cada intento; sin segundo PATCH automático.
- Dos confirmaciones para método experimental: revisión de lista y permiso específico.
- Código de ambas aplicaciones organizado en subcarpetas dedicadas del monorepo.

## 0.6.3
- Corrección del selector de menú de ChatGPT para conversaciones antiguas.

## 0.6.2
- Exportación real de mensajes bajo demanda, ajustes de selección de carpeta y diálogos de borrado.
