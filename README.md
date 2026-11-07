# Auri–Orion Utilities · Publicaciones públicas

Repositorio público de **Auri–Orion** para herramientas y documentación que pueden distribuirse después de una revisión de seguridad, licencias y privacidad.

## Auri–Orion MCP Browser

Extensión Chrome/Edge basada en [Browser Session MCP](https://github.com/ashu0729will/browser-mcp-lab) v0.5.0, con licencia MIT original conservada. Permite que un cliente MCP autorizado utilice una sesión del navegador a través de un **servidor local** instalado por separado.

- [Código, instalación y pruebas](extensions/auri-orion-mcp-browser/)
- [Extensión para Chrome (carpeta descomprimida)](extensions/auri-orion-mcp-browser/src/browser-extension/)
- [Política de privacidad](PRIVACY.md)
- [Instrucciones y requisitos de publicación en Chrome Web Store](CHROME_WEB_STORE.md)
- [Política de revisión y sincronización](PUBLICACION_SEGURA.md)

**Conexión por defecto en Chrome:** `127.0.0.1:9777`. El servidor independiente del fork puede utilizar `9778`, configurando expresamente el mismo puerto en el popup. El repositorio de código **no sustituye** a la instalación del servidor MCP local.

**Estado:** fuentes distribuidas públicamente, pruebas automatizadas y conexión WebSocket verificadas previamente; la aprobación en Chrome Web Store y la validación integral de las herramientas MCP **no están certificadas aquí**.

## Auri–Orion ChatGPT Manager

Extensión Chrome **v0.6.7** para organizar conversaciones de ChatGPT: inventario local, carpetas y subcarpetas, búsqueda, lectura, exportación Markdown/HTML/JSON/ZIP y borrado remoto seleccionado con confirmación. **Las conversaciones eliminadas remotamente se ocultan de los listados y contadores; las copias locales de mensajes pueden permanecer almacenadas.**

- [Código fuente y guía de uso](extensions/chatgpt-manager/)
- [Extensión cargable en Chrome](extensions/chatgpt-manager/manifest.json)
- [Política de privacidad actualizada v0.6.7](extensions/chatgpt-manager/docs/PRIVACY.md)
- [Seguridad y limitaciones](extensions/chatgpt-manager/docs/SECURITY.md)
- [Ficha y requisitos de Chrome Web Store](extensions/chatgpt-manager/docs/CHROME_WEB_STORE.md)

La extensión trabaja sobre la sesión autenticada de ChatGPT y utiliza algunas rutas web internas no documentadas, cuya compatibilidad puede cambiar; no es una herramienta oficial de OpenAI. Las funciones destructivas requieren confirmación y pueden ser irreversibles. **La publicación en GitHub no equivale a aprobación por Chrome Web Store.**

## Alcance

Este repositorio **no es un espejo del desarrollo interno**. Se publican solo componentes auditados. No incluir credenciales, datos de sesiones, información corporativa, referencias privadas o archivos de terceros cuya redistribución no esté autorizada.

## Créditos

Fork de [ashu0729will/browser-mcp-lab](https://github.com/ashu0729will/browser-mcp-lab), sujeto a la licencia MIT que se conserva en [`src/LICENSE`](extensions/auri-orion-mcp-browser/src/LICENSE). Las modificaciones Auri–Orion se documentan junto al código.
