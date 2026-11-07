# Instalación segura en Windows / Chrome

## Requisitos

Node.js 22 o superior, Chrome/Edge actual y un cliente MCP que soporte stdio. No son necesarios paquetes npm de runtime.

1. Obtener el repositorio `auriorion/auri-orion-utilities` y entrar en `extensions/auri-orion-mcp-browser/`.
2. En `chrome://extensions`, activar *Modo desarrollador* y seleccionar **Cargar descomprimida** → `src/browser-extension/`.
3. **Modo A — reutilizar el servidor Browser Session MCP existente:** si ya funciona en `127.0.0.1:9777`, abrir el popup de Auri–Orion MCP Browser y conectar en el **9777 predeterminado**. No registrar ni ejecutar otro servidor en ese puerto. Ambas extensiones pueden estar conectadas simultáneamente al mismo WebSocket; usar `browser_select` para escoger el navegador correcto.

4. **Modo B — servidor Auri–Orion independiente (opcional):** registrar otro MCP con puerto **9778** y cambiar manualmente el popup a **9778**. Ejemplo (cambiar la ruta):

```json
{
  "mcpServers": {
    "auri-orion-mcp-browser": {
      "command": "node",
      "args": ["C:\\ruta\\auri-orion-utilities\\extensions\\auri-orion-mcp-browser\\src\\mcp-server\\index.js"],
      "env": {"BSM_PORT": "9778"}
    }
  }
}
```

5. Solo para el modo B, reiniciar/reconectar el MCP dentro del cliente y conectar el popup al **9778**.
6. Validar `connection_status` → `browser_select` si procede → `tabs_list` → `snapshot` → `read`. Probar `click` y `type` solo en `src/test-pages/index.html` servido en localhost o una página de test sin datos reales.
7. Desconectar la nueva extensión cuando no esté en uso. La original y su configuración deben permanecer intactas.

## Empaquetado

Desde `src/`: `npm test`, `npm run package:store` y `npm run package:source`. O ejecutar `code/paquetizar.ps1` desde la raíz. Los ZIP se crean en `src/dist/`, no están versionados ni se publican hasta validar el paquete.

## Host nativo opcional (Windows)

El canal WebSocket es suficiente para la primera prueba. Si se requiere native messaging, copiar **el ID de esta extensión**, no el de la original, de `chrome://extensions` a `src/native-messaging-host/chrome-extension-id.txt`. Ejecutar `node src/native-messaging-host/install.js`. Este instalador registra el host `auri_orion_mcp_browser` y no elimina `browser_session_mcp`.

**No** lanzar `npm start` manualmente si el MCP cliente gestiona ya el proceso: causaría conflicto de puerto. Tampoco iniciar otro servidor en 9777 si ya está ocupado por el MCP original. El diagnóstico `node src/mcp-server/index.js --doctor` se ejecuta únicamente cuando no hay otro servidor ocupando 9778.
