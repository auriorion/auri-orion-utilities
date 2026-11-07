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

## Alcance

Este repositorio **no es un espejo del desarrollo interno**. Se publican solo componentes auditados. No incluir credenciales, datos de sesiones, información corporativa, referencias privadas o archivos de terceros cuya redistribución no esté autorizada.

## Créditos

Fork de [ashu0729will/browser-mcp-lab](https://github.com/ashu0729will/browser-mcp-lab), sujeto a la licencia MIT que se conserva en [`src/LICENSE`](extensions/auri-orion-mcp-browser/src/LICENSE). Las modificaciones Auri–Orion se documentan junto al código.
