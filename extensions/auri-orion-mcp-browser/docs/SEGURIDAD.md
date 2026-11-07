# Seguridad, privilegios y límites de confianza

El acceso MCP permite leer contenido de páginas, URL, valores y capturas, y realizar clics/escritura. El servidor MCP recibe esos datos localmente, pero el cliente IA podría transmitirlos a un servicio externo. La extensión trabaja con sesión autenticada y es **altamente privilegiada**.

- Se mantienen los permisos `tabs`, `scripting`, `storage`, `alarms`, `nativeMessaging` y host `<all_urls>` porque la referencia los necesita para la misma operativa. No se añaden permisos extras.
- El servidor solo escucha en `127.0.0.1`; **no abrir 9777 ni 9778 a LAN, Tailscale, VPN, reverse proxy o Internet**.
- **Limitación heredada importante:** el WebSocket original no implementa autenticación fuerte por petición. Otros procesos locales o sitios que logren interactuar con loopback pueden suponer riesgo. Ejecutar solo en un equipo de confianza y detener el servidor al terminar. Una futura versión puede añadir emparejamiento criptográfico con migración coordinada, nunca de forma que rompa el MCP existente sin pruebas.
- No permitir que agentes automáticos accedan a contraseñas, cookies, tokens, datos bancarios o sesiones privadas sin autorización específica. Evitar descargas y formularios con cambios destructivos fuera de pruebas.
- El host nativo de Auri–Orion se registra con nombre exclusivo y no debe modificar el host original. La extensión original debe permanecer disponible para rollback.
- Chrome protege páginas internas (`chrome://`), Chrome Web Store y ciertas pestañas; la paridad no implica saltar esas protecciones.
- El árbol fuente procede de un tercero MIT y requiere revisión de seguridad antes de distribuirse fuera del entorno de pruebas propio.
