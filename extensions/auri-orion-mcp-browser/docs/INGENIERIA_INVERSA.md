# Ingeniería inversa: referencia y paridad

Fecha: 7 de noviembre de 2026.

- Extensión inicial aportada: ZIP Chrome `ahbfgkidmmniibailgoeegccojphmjaj` con carpeta `0.3.3_0`. Se inspeccionó estáticamente; no se ejecutó.
- Fuente pública de referencia: [ashu0729will/browser-mcp-lab](https://github.com/ashu0729will/browser-mcp-lab), árbol Git `31675c4ff03750aeb8eee3f45d9b92b75d26850e`, v0.5.0 y licencia **MIT**, preservada en `src/LICENSE`.
- Se copió el código completo de la versión 0.5.0, su servidor, puente opcional, tests, scripts, ejemplos y documentación, con modificaciones mínimas para identidad/puerto/idioma. La referencia del ZIP v0.3.3 sirve para entender la evolución, no como fuente ejecutable de esta compilación.

## Arquitectura revisada

1. Extensión MV3: `chrome.tabs`, `chrome.scripting`, inyección en pestañas normales, `chrome.storage` para preferencias e identificador de cliente.
2. Comunicación local: `chrome.runtime.connectNative` con host registrado o WebSocket a `ws://127.0.0.1:9777` (fallback por defecto, compatible con servidor existente; servidor independiente configurable en 9778); conexión al servidor Node.
3. MCP: el proceso Node recibe peticiones MCP stdio del cliente y las traduce a mensajes de la extensión a través de WebSocket.
4. Mensajería nativa opcional: el instalador Windows registra **solo** `auri_orion_mcp_browser` con el ID propio; no borra claves del host original.

## Contrato preservado

Herramientas: `connection_status`, `browser_select`, `navigate`, `snapshot`, `read`, `click`, `type`, `press_key`, `evaluate`, `screenshot`, `scroll`, `tabs_list`, `tab_select`, `wait`.

Conservar nombres/argumentos/respuestas de herramienta, `tabId` explícito, `snapshot.revision`, `expectRevision`, `effect`, detección de pestañas de origen `agent/user`, límites de mensajes `BSM_MAX_MESSAGE_BYTES`, manejo de desconexión y respuestas tardías. No cambiar silenciosamente ninguna función para Auri–Orion.

## Diferencias de este fork

| Elemento | Original 0.5.0 | Auri–Orion |
| --- | --- | --- |
| Nombre visual | Browser Session MCP | Auri–Orion MCP Browser |
| Puerto predeterminado de extensión | 9777 | 9777 (tras prueba real de Chrome) |
| Puerto predeterminado del servidor Node independiente | 9777 | 9778 |
| Host nativo | `browser_session_mcp` | `auri_orion_mcp_browser` |
| Firefox ID | ID del upstream | `auri-orion-mcp-browser@noralemilenio.local` |
| Texto del popup | Chino | Español |
| Licencia/copyright | MIT upstream | MIT upstream, sin retirar autoría |

**No se añadieron permisos extras:** más permisos no mejoran la paridad y aumentan el alcance sobre sesiones del usuario. Al probar debe conservar los permisos originales del manifiesto y conectar al servidor MCP correcto (actual en 9777, o instancia independiente en 9778). Nunca ejecutar dos servidores en el mismo puerto.
