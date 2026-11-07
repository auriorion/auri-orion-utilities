# Política de privacidad · Auri–Orion MCP Browser

**Última actualización: 7 de noviembre de 2026.** Publicador y responsable del proyecto: [Auri–Orion](https://github.com/auriorion). Consultas de privacidad: [GitHub Issues](https://github.com/auriorion/auri-orion-utilities/issues) (no adjuntes datos sensibles).

## Finalidad

Auri–Orion MCP Browser es una extensión que conecta el navegador con un servidor MCP instalado en el propio equipo. Su propósito es permitir que un cliente MCP elegido por el usuario observe e interactúe con pestañas del navegador a petición del usuario. No es un servicio de analítica, publicidad ni seguimiento de navegación.

## Información a la que puede acceder

Según las operaciones autorizadas, puede procesar identificadores y direcciones de pestañas, títulos, texto y elementos de páginas web, enlaces, atributos HTML, valores de formularios, resultados de scripts solicitados por el cliente y capturas de pantalla. El contenido de una página autenticada puede contener datos personales o sensibles; la extensión no debe conectarse a clientes MCP que no sean de confianza.

Los permisos `tabs`, `scripting`, `storage`, `alarms`, `nativeMessaging` y acceso a páginas web (`<all_urls>`) permiten estas funciones. El acceso a todas las páginas es necesario para operar sobre la pestaña seleccionada por el usuario; no implica que todas se lean continuamente. Chrome restringe por sí mismo páginas internas y otros contextos protegidos.

## Transmisión, terceros y destinatarios

La extensión comunica instrucciones y resultados al **servidor local** mediante WebSocket en `127.0.0.1` o mensajería nativa del navegador. El proyecto no opera servidores propios de recopilación de contenido, telemetría ni publicidad, ni vende datos.

El cliente MCP que el usuario conecte puede **reenviar las respuestas a servicios de IA u otros proveedores externos**, conservar conversaciones y generar registros; esto depende de ese cliente y de su configuración. Esta política no cubre las prácticas de esos terceros. Las páginas visitadas también se comunican con sus propios servidores, según sus condiciones.

## Almacenamiento y conservación

La extensión puede conservar en el almacenamiento local de Chrome el puerto, el estado de conexión y los identificadores de sesión necesarios. El servidor MCP local puede guardar capturas de pantalla en una carpeta del equipo hasta que se eliminen manualmente. El cliente MCP externo puede guardar sus propios registros. La extensión no elimina copias ya transferidas a otros programas.

## Control, eliminación y seguridad

El usuario puede pulsar **Desconectar**, desinstalar la extensión o eliminar los datos locales del navegador. Para eliminar capturas y registros, debe revisarse también el servidor MCP y los clientes que hayan recibido información. No se garantiza que la desconexión elimine datos previamente enviados.

El servidor local debe permanecer accesible solo desde el equipo, sin publicar su puerto en Internet, la LAN o un proxy. No se deben facilitar sesiones que contengan contraseñas, tokens, documentos privados ni información protegida a agentes sin autorización expresa.

## Contacto, cambios y atribución

Para preguntas, soporte o solicitudes sobre el tratamiento realizado por **este proyecto**, abre un asunto en [auriorion/auri-orion-utilities](https://github.com/auriorion/auri-orion-utilities/issues) sin incluir datos privados. Las versiones de esta política se conservan en el historial público Git.

Este proyecto es un fork de [Browser Session MCP](https://github.com/ashu0729will/browser-mcp-lab), bajo licencia MIT, cuyos avisos se conservan. El desarrollador del proyecto original no es el responsable de esta distribución.
