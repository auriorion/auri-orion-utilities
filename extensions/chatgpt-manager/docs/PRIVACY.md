# Política de privacidad · Auri–Orion ChatGPT Manager (v0.6.7)

**Actualización:** 7 de noviembre de 2026  
**Responsable del proyecto:** [Auri–Orion](https://github.com/auriorion)  
**Contacto y soporte:** [GitHub Issues del proyecto](https://github.com/auriorion/auri-orion-utilities/issues). No adjuntar chats, tokens ni datos personales.

## Finalidad y funcionamiento

La extensión permite a una persona gestionar sus propias conversaciones de ChatGPT: descubrir y sincronizar el índice disponible, leer bajo demanda, organizar carpetas, importar/exportar conversaciones y, solo con confirmaciones explícitas, solicitar la eliminación de chats seleccionados de su cuenta.

Se trata de un proyecto independiente, **no oficial ni afiliado a OpenAI**.

## Datos a los que puede acceder

Con las operaciones iniciadas por el usuario, puede procesar identificadores únicos de conversaciones (UUID), títulos, fechas, organización en carpetas, estado de archivado o eliminación y el texto de mensajes para lectura y exportación. Las conversaciones pueden contener datos personales o sensibles. También procesa archivos de exportación JSON elegidos por el usuario.

La función de sincronización puede obtener un identificador técnico de cuenta en forma de huella SHA-256, para impedir operaciones sobre otra cuenta. Para operaciones sobre ChatGPT, una función temporal dentro de la pestaña autenticada puede acceder al token de sesión y utilizarlo **solo para consultas al origen `chatgpt.com`**; el token no se guarda en IndexedDB, localStorage o archivos exportados ni se transfiere al editor de la extensión.

## Comunicaciones y terceros

Las solicitudes a la cuenta (consulta del índice y mensajes, y borrado autorizado) se envían **directamente al propio sitio `https://chatgpt.com`**, usando la sesión iniciada por el usuario. Algunas utilizan endpoints web internos y no documentados de ChatGPT, que podrían cambiar.

Auri–Orion ChatGPT Manager **no dispone de un servidor propio que reciba el historial**, no incluye SDK publicitarios ni analítica remota y no vende datos. El contenido que el usuario descarga, importa o comparte después queda bajo su control. Las interacciones con ChatGPT están sujetas a las condiciones y la política de privacidad del proveedor de ese servicio.

## Almacenamiento local y conservación

La extensión utiliza **IndexedDB del navegador** para guardar índice de conversaciones, carpetas, mensajes y datos importados. También puede usar almacenamiento local de preferencias para filtros y opciones de interfaz. Estos datos permanecen hasta que el usuario los elimina o se borran los datos de la extensión/perfil.

La exportación es una descarga elegida por el usuario (Markdown, HTML, JSON o ZIP) y puede contener contenido de chats. Su custodia corresponde al usuario.

**Importante:** cuando se elimina una conversación remotamente, la extensión puede ocultarla del catálogo y conservar una marca local de eliminación para evitar que reaparezca tras sincronizaciones; **esto no elimina automáticamente mensajes o copias locales previamente almacenadas**. El borrado de carpetas virtuales no borra los chats de la cuenta.

## Permisos y control

- `scripting`: ejecutar funciones puntuales para inventariar o interactuar con la sesión de ChatGPT.
- Acceso opcional a `https://chatgpt.com/*`: se solicita para operaciones conectadas; no se solicita acceso general al historial de navegación ni a todos los sitios.
- El usuario controla cuándo sincroniza, importa, exporta y borra; las acciones destructivas requieren revisión y confirmación.

## Eliminación y seguridad

El usuario puede gestionar sus datos locales y eliminar la extensión y sus datos del navegador. Para borrar una conversación **de la cuenta de ChatGPT**, la extensión requiere seleccionar chats, confirmar la operación y comprobar identificadores; ese borrado puede ser **irreversible**. La extensión no garantiza la recuperación de todas las conversaciones ni de adjuntos binarios.

Para ejercer derechos sobre datos que mantiene OpenAI, consultar las opciones y la política de privacidad de ese servicio. Para dudas del proyecto y este tratamiento local, usar el contacto arriba indicado sin publicar datos sensibles.

## Cambios y auditoría

La política puede actualizarse cuando cambie el software o los datos tratados. El código público y su historial de versiones se encuentran en [Auri–Orion Utilities](https://github.com/auriorion/auri-orion-utilities).
