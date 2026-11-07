# Auri–Orion MCP Browser

Extensión Chrome/Edge/Firefox y servidor MCP local **funcionalmente compatibles** con [Browser Session MCP](https://github.com/ashu0729will/browser-mcp-lab) v0.5.0 (licencia MIT). Se conserva el protocolo y el conjunto de herramientas, sin modificar ni desinstalar el proyecto original usado en Manos y Ojos. Compatible no significa probado en vuestra sesión: el estado de las pruebas se consulta en el workflow de GitHub y en `docs/QA.md`.

## Estructura

- `src/`: **código fuente** y pruebas originales de la versión 0.5.0, con cambios mínimos identificados en `docs/INGENIERIA_INVERSA.md`.
- `code/`: scripts de **generación del código instalable** y explicación de paquetes ZIP sin dependencias runtime.
- `docs/`: ingeniería inversa, instalación, seguridad y pruebas de aceptación.

## Arranque rápido

1. Instalar Node.js **22+** si es necesario para el servidor MCP.
2. En Chrome, `chrome://extensions` → *Modo desarrollador* → **Cargar descomprimida** → `src/browser-extension/`.
3. **Conexión al servidor existente (recomendado en Auri–Orion):** abrir el popup, confirmar **9777** (predeterminado) y pulsar **Conectar**. No arrancar otra instancia del servidor MCP en 9777. Con múltiples extensiones conectadas, escoger el navegador correcto con `browser_select`.
4. **Servidor MCP independiente (opcional):** registrar en el cliente MCP `command: node`, ruta a `src/mcp-server/index.js`, `BSM_PORT=9778`; después cambiar el puerto del popup a **9778** y conectar.
5. Verificar `connection_status`, `tabs_list`, `snapshot` y pruebas sobre páginas controladas.

**No iniciar dos servidores sobre el mismo puerto.** El WebSocket es solo loopback (`127.0.0.1`). No retirar la extensión original hasta completar la validación funcional de Manos y Ojos.

Ver `docs/INSTALACION.md` para comandos completos y `docs/SEGURIDAD.md` para limitaciones importantes de permisos y acceso al navegador.
