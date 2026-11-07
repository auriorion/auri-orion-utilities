# Preparación para Chrome Web Store

Este documento describe la distribución de **Auri–Orion MCP Browser**, no certifica la aprobación de Google.

## Distribución prevista

- Mantener **el repositorio de código público** para documentación, auditoría y soporte.
- Configurar la **ficha de Chrome Web Store con distribución privada/restringida a usuarios autorizados**, siempre que la cuenta de desarrollador lo permita. La visibilidad de la ficha y la visibilidad del repositorio GitHub son independientes.
- Publicar nuevas versiones desde la consola de desarrollador, incrementando el campo `version` del `manifest.json`. Las versiones instaladas desde Chrome Web Store reciben actualizaciones a través de Chrome; una instalación local «Cargar descomprimida» no se transforma automáticamente en instalación de la tienda.
- No incorporar ni distribuir el servidor local Node dentro de la extensión: los usuarios deben instalar/configurar por separado un servidor MCP autorizado.

## URLs para la ficha

- Repositorio/soporte: https://github.com/auriorion/auri-orion-utilities
- Política de privacidad: https://github.com/auriorion/auri-orion-utilities/blob/main/PRIVACY.md
- Instrucciones: https://github.com/auriorion/auri-orion-utilities/tree/main/extensions/auri-orion-mcp-browser

## Permisos a justificar en la consola

- `tabs`: identificar pestañas y contexto de navegación solicitado.
- `scripting` y `<all_urls>`: leer e interactuar con el DOM de las páginas autorizadas por el usuario.
- `storage`: guardar opciones de conexión local.
- `alarms`: control de estado y reintentos de conexión.
- `nativeMessaging`: comunicación opcional con el servidor local mediante host nativo.
- Conexión `ws://127.0.0.1:*`: canal WebSocket a una aplicación del equipo del usuario, no un servidor de recopilación de datos del editor.

**Uso único:** conectar el navegador con un cliente MCP elegido por el usuario para automatización solicitada por él. No se incluye análisis de comportamiento, monetización publicitaria ni venta de datos.

## Revisión previa

1. Compilar el paquete desde `extensions/auri-orion-mcp-browser/src` usando `npm test` y `npm run package:store`.
2. Verificar manifiesto MV3, archivos locales, iconos 16/48/128, permisos y políticas de Chrome Web Store.
3. Revisar el uso de `evaluate` y cualquier ejecución de JavaScript suministrado por el cliente MCP: **puede requerir una revisión de políticas adicional** de Google; no ocultar este comportamiento.
4. Probar conexión real al servidor local y las funciones MCP en una página de pruebas.
5. Subir ZIP a la consola, completar las declaraciones de privacidad y seguridad, elegir acceso restringido, y comprobar el estado de revisión.
6. Instalar la versión de la tienda en un perfil de Chrome de prueba y validar las actualizaciones con una versión posterior.

**Estado inicial:** código preparado para publicación; subida, aprobación y actualización automática por Chrome Web Store pendientes de evidencia.
