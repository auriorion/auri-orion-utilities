# Plan QA · paridad con Browser Session MCP v0.5.0

## Pruebas automatizadas

Desde la carpeta `src`, ejecutar `npm test` (suite original + checks Auri). En GitHub Actions el workflow `auri-orion-mcp-browser.yml` realiza la misma ejecución con Node 22 y crea paquetes ZIP si pasa.

## Matriz de aceptación manual en Chrome real

| Sistema | Prueba | Criterio |
| --- | --- | --- |
| Conexión | `connection_status` + reconexión | Se conecta por defecto a 9777; en modo dedicado, manualmente a 9778 |
| Multi-navegador | `browser_select` | Selección explícita, sin cambiar automáticamente |
| Pestañas | `tabs_list`, `tab_select` | Mantiene `tabId` y origen `user/agent` |
| Lectura | `snapshot`, `read` | Referencias y atributos completos |
| Clics | `click` | Cambios visibles, devuelve `effect` |
| Escritura | `type`, `press_key` | Actualiza correctamente inputs permitidos |
| Navegación | `navigate`, `wait` | Nueva pestaña o pestaña seleccionada según parámetros |
| Captura | `screenshot` | Imagen de pestaña correcta sin romper conexión |
| DOM avanzado | `evaluate`, `scroll` | Funcionan dentro de límites CSP |
| Cambios de página | `expectRevision` desactualizado | Rechaza con `STALE_OBSERVATION` |
| Resiliencia | Desconectar y reconectar | Sin reintento destructivo al perder respuesta |
| Aislamiento | Ambas extensiones instaladas | Ningún conflicto con la referencia |

### Estados

- Fuente copiada: **IMPLEMENTADA** una vez esté presente en GitHub.
- Tests de versión auri.1: **SUPERADOS** en GitHub Actions (ejecución 42404004186). La versión auri.2 requiere su propio CI.
- Chrome real: el usuario mostró el 7/11/2026 el popup **conectado por WebSocket en 9777**; esa verificación es manual.
- Integración completa de las herramientas MCP de Manos y Ojos: **PENDIENTE**; no afirmar **PROBADA CON ÉXITO** antes de verificar operaciones reales y seguridad.
