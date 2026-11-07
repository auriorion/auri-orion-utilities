# Chrome Web Store · Auri–Orion ChatGPT Manager v0.6.7

## Ficha
- Título: **Auri–Orion ChatGPT Manager**
- Resumen: **Organiza, busca, exporta y elimina con confirmación tus conversaciones de ChatGPT desde un gestor local.**
- Categoría: Productividad
- Idioma: Español
- Página principal: https://github.com/auriorion/auri-orion-utilities/tree/main/extensions/chatgpt-manager
- Soporte: https://github.com/auriorion/auri-orion-utilities/issues
- Privacidad: https://github.com/auriorion/auri-orion-utilities/blob/main/extensions/chatgpt-manager/docs/PRIVACY.md

## Comportamiento a declarar
El usuario inicia operaciones. El gestor procesa metadatos y contenidos de conversaciones y guarda una copia local para poder organizar, buscar, leer y exportar. El permiso `scripting` y el acceso opcional a `chatgpt.com` sirven para operar con su propia sesión.

**También permite borrar conversaciones de la cuenta**, tras verificación y confirmación explícita. Las eliminaciones remotas pueden ser irreversibles. El gestor no garantiza cobertura total del historial ni compatibilidad estable con endpoints internos no documentados.

No declarar que la extensión no almacena contenido ni que usa una API oficial de OpenAI. No usar una política antigua de otra herramienta. El proyecto no es oficial ni afiliado a OpenAI.

## Material gráfico
- Icono PNG 128 × 128.
- Al menos una captura JPEG/PNG RGB 1280 × 800 o 640 × 400, sin datos privados.
- Mosaico pequeño 440 × 280; gran mosaico 1400 × 560 (opcionales).
- No incluir chats ni cuentas reales sin revisar/redactar datos personales.

## Checklist
1. Revisar el `manifest.json` de **0.6.7** y el ZIP exacto que se subirá.
2. Ejecutar suite de pruebas; comprobar errores/compatibilidad en Chrome real.
3. Cumplimentar el tratamiento de datos en la pestaña **Privacidad** y enlazar esta política vigente.
4. Configurar distribución **privada/restringida** para los usuarios permitidos, si la cuenta de desarrollador habilita ese modo.
5. Subir el paquete, enviarlo a revisión y comprobar el estado real; el repositorio público **no sustituye** la revisión de Chrome Web Store.
6. Instalar desde la tienda cuando esté aprobada para recibir sus actualizaciones (las instalaciones descomprimidas no se transforman automáticamente).
