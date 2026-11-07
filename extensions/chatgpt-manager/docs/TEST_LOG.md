# Registro de pruebas — v0.6.4

- [PASS] `node --check` de los módulos JS.
- [PASS] Suite de exportación `test_export062.js`.
- [PASS] Suite de componentes v0.6.1 actualizada `test_fixes061.js`.
- [PASS] Suite de catálogo v0.5 `test_manager05.js`.
- [PASS] Suite de sincronización `test_sync06.js`.
- [PASS] `test_id_only.js`: título renombrado aceptado, URL errónea detenida, ID distinto devuelto por ChatGPT detenido, cuenta distinta detenida; una sola solicitud PATCH para un ID válido y ninguna para IDs inválidos.
- [PENDIENTE] Chrome real con sesión del usuario: opción visual de borrado y método experimental de sesión, test de un chat prescindible, examen del informe y reconteo. **Ningún chat real eliminado en estas pruebas.**


## 0.6.5 — subcarpetas y menú contextual
- Helpers de carpetas: PASS (árbol, rutas, subcarpetas, totales, ciclos).
- Sintaxis de JavaScript: PASS.
- Regresión de exportación, IDs y sincronización: PASS después de actualizar dos aserciones antiguas de versión/documentación.
- HTML: ID de diálogos y carga de módulos: PASS.
- No se efectuó borrado de chats reales; borrar carpetas solo modifica IndexedDB local.
- Validación gráfica en Chrome: pendiente. El método visual de eliminación remota continúa pendiente.

## 0.6.7 — validación y límites
- El 07/11/2026 el usuario confirmó un borrado real por ID: una conversación de prueba, resultado «1 confirmados», conversación ya inaccesible en ChatGPT.
- Pruebas automatizadas de visibilidad, recuento y preservación de tombstones superadas localmente.
- Pendiente comprobar la interfaz v0.6.7 en Chrome del usuario. Ningún nuevo borrado real se hizo durante el desarrollo.
