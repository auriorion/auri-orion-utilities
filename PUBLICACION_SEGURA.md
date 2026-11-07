# Política de publicación selectiva

- Desarrollo interno: `noralemilenio/auri-orion-utilities` (**privado**).
- Distribución pública: `auriorion/auri-orion-utilities` (**público**).
- El público contiene **solo componentes auditados**, comenzando por Auri–Orion MCP Browser; **no se realiza un espejo completo** del privado.
- Antes de publicar una versión, comparar los cambios, revisar el contenido y el historial visible para descartar datos internos, identificadores privados, contraseñas, tokens, cookies, logs, capturas o configuraciones corporativas.
- Revisar dependencias, llamadas a servicios de terceros, propiedad intelectual y licencias. Conservar la licencia MIT y atribución del proyecto de origen.
- No copiar otras extensiones o catálogos de contenido con restricciones de redistribución sin revisión independiente.
- Las modificaciones públicas de documentación o de compatibilidad deben retroalimentarse al desarrollo privado cuando proceda; documentar excepciones (p. ej., URL públicas y textos de la ficha).
- Antes de publicar un ZIP para Chrome Web Store: sincronizar versión, comprobar `npm test`, ejecutar GitHub Actions, verificar el paquete y la política de privacidad. No confundir «subido al repositorio» con «publicado y aprobado en la tienda».
- **No hay sincronización automática habilitada**: cualquier automatización futura debe aplicar una allowlist por rutas y un control de aprobación; nunca hacer un `git push --mirror` del privado al público.

**Registro de origen inicial:** el directorio público `extensions/auri-orion-mcp-browser/` se preparó mediante copia selectiva de la versión `0.5.0-auri.2` del privado y adaptaciones de enlaces y documentación para publicación pública.
