# Auri–Orion MCP Browser — no instala ni sustituye la extensión original.
$ErrorActionPreference = 'Stop'
$src = (Resolve-Path (Join-Path $PSScriptRoot '..\\src')).Path
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22+ no está disponible en PATH.' }
$version = [int]((node -p 'process.versions.node.split(".")[0]') | Out-String).Trim()
if ($version -lt 22) { throw 'Se requiere Node.js 22 o posterior.' }
Push-Location $src
try {
  & npm test
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas. No se empaqueta.' }
  & npm run package:store
  if ($LASTEXITCODE -ne 0) { throw 'Falló paquete para extensión.' }
  & npm run package:source
  if ($LASTEXITCODE -ne 0) { throw 'Falló paquete del código fuente.' }
  Write-Output 'Listo: paquetes en src/dist. La extensión instalada no ha sido modificada.'
} finally { Pop-Location }
