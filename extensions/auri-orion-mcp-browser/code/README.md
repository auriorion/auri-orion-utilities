# Código instalable y paquetes

La **fuente editable** reside en `../src/`; este directorio contiene el script para convertirla en artefactos instalables. Se evita duplicar JavaScript generado o introducir ZIP opacos sin pruebas.

Ejecutar desde PowerShell:

```powershell
.\\code\\paquetizar.ps1
```

Primero corre `npm test`. Si pasa, crea los ZIP desde los scripts oficiales. Resultado: `../src/dist/` (no se añade al control de versiones). En GitHub Actions los ZIP quedan también como artefactos del job cuando se configure `upload-artifact`.
