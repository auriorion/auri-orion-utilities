# Seguridad · Auri–Orion ChatGPT Manager v0.6.7

- Extensión Chrome Manifest V3; permiso API `scripting` y host opcional limitado a `https://chatgpt.com/*`.
- Sin credenciales, cookies o tokens permanentes embebidos en el paquete. Los tokens temporales de la sesión web solo deben usarse dentro del contexto de la página y sobre el propio origen.
- Los metadatos, mensajes leídos y datos importados **sí se almacenan localmente** en IndexedDB; no afirmar que la herramienta no guarda conversaciones.
- Los archivos JSON/Markdown/HTML/ZIP exportados pueden contener información privada; revisarlos antes de compartir.
- Las interfaces web de ChatGPT usadas para sincronización/lectura/borrado no son APIs públicas documentadas y pueden cambiar o dejar de funcionar.
- Las eliminaciones remotas se realizan solo tras selección, verificación de ID/cuenta y confirmación. La operación puede ser irreversible; no repetir automáticamente un borrado cuyo resultado sea incierto.
- El método de eliminación por ID tuvo una prueba real confirmada el 7/11/2026; esto **no equivale** a certificar todos los flujos o lotes grandes.
- La marca local de eliminación es una medida para que el catálogo no reactive chats remotos borrados; no supone purga automática de mensajes/copia local.
- La extensión no es oficial de OpenAI.
- Antes de publicar en Chrome Web Store: revisar política de uso único, transparencia sobre datos, compatibilidad con los términos del servicio, contenido sensible de capturas y permisos.
