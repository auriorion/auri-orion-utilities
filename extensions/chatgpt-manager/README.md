# Auri–Orion ChatGPT Manager

Extensión Chrome independiente (Manifest V3), versión **0.6.7**.

La carpeta completa es instalable mediante `chrome://extensions` → *Cargar descomprimida*. Para actualizar una instalación anterior conserva exactamente la misma carpeta física y pulsa **Recargar**; así se mantiene el ID de extensión y su IndexedDB local.

## Funciones
- Sincronizar el índice de la cuenta y conservarlo localmente.
- Leer conversaciones bajo demanda y exportar Markdown, HTML o JSON, individualmente o a ZIP por selección múltiple.
- Carpetas virtuales y **subcarpetas anidadas**: menú `···` para renombrar, crear subcarpeta y eliminar estructura con confirmación. El borrado de carpetas no elimina chats de ChatGPT ni mensajes locales; deja los chats sin carpeta.
- Filtros, búsqueda y papelera local.
- Borrado remoto por lotes aprobados con `BORRAR N`. Dos métodos independientes: visual o **sesión web por ID, validada en Chrome** (optativo y con consentimiento separado).
- En ambos métodos el **UUID del chat** es la identidad estable. Los títulos pueden cambiar: **nunca se utilizan para aprobar o rechazar una eliminación**.

## Método de sesión: advertencia
La lectura y el borrado opcional usan rutas internas de ChatGPT **no documentadas públicamente**. La versión de sesión verifica cuenta autenticada (huella SHA-256) y UUID, ejecuta a lo sumo una solicitud de borrado por ID y requiere evidencia posterior. Los tokens no salen de la pestaña ni se guardan en disco. Si la respuesta es incierta, se detiene sin reintentar la petición. **El usuario ha confirmado una eliminación real en Chrome el 07/11/2026.** El método utiliza rutas internas no documentadas que pueden cambiar; los lotes grandes no están certificados.

## Seguridad y límites
- El borrado real es irreversible; revisar la lista e introducir `BORRAR N`.
- No se utilizan títulos, fechas o nombres de carpetas como identidad para borrar.
- La exportación textual no incluye necesariamente adjuntos binarios, imágenes o mensajes de ramas alternativas.
- No se promete cobertura absoluta: la sincronización no garantiza incluir archivados o todos los proyectos.
- No promete cobertura total de conversaciones archivadas ni API estable de OpenAI.
- Nada de servidor propio ni scripts permanentes que interfieran con ChatGPT.

Consultar `docs/TEST_LOG.md` para resultados de simulación y límites.

## v0.6.6 — método por ID
- Si existe huella de cuenta, el diálogo propone la vía por ID (confirmada en la cuenta actual) pero exige consentimiento separado.
- La verificación por ID y cuenta no depende del título ni de la interfaz visible. Borrado real pendiente de prueba en Chrome.

## v0.6.7 — ocultación de chats borrados
- Los chats eliminados remotamente desaparecen del explorador, las carpetas, las búsquedas y todos los contadores.
- Se conserva una marca local invisible por UUID para impedir que otra sincronización o importación los reactive.
- La eliminación desasigna el chat de su carpeta y limpia la vista previa.
- No se purgan automáticamente mensajes y copias locales ya almacenados.
- El borrado por ID está validado con un chat real. La interfaz web interna puede cambiar.
