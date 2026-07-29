# Despliega esta carpeta en la Azure Static Web App (el frontend de PC).
#
# La app se publica en TRES sitios. Vercel (appmesoee.vercel.app, la que tienen
# instalada los móviles de planta) y GitHub Pages se despliegan solos con cada
# push a main. La Static Web App NO: su provider es "SwaCli" (subida manual),
# así que hay que ejecutar este script después de cada push para que los tres
# sirvan la misma versión.
#
#   powershell -ExecutionPolicy Bypass -File .\desplegar-swa.ps1
#
# Requisitos: Azure CLI con sesión iniciada (az login) y Node.js.

$ErrorActionPreference = 'Stop'

$swaNombre = 'APK_JAULA_ELEVACION'
$swaGrupo  = 'rg-mes-app'
$origen    = $PSScriptRoot

# Ficheros que se publican. Lista explícita a propósito: así ni el .git ni
# ningún fichero de trabajo acaban en el sitio publicado.
$publicar = @(
    'index.html',
    'sw.js',
    'manifest.json',
    'icon.svg',
    'staticwebapp.config.json'
)

# El binario de despliegue de Azure falla si la ruta lleva espacios, y esta
# carpeta los tiene ("APK MOBIL MES-OEE"). Se copia a un temporal sin espacios.
$destino = Join-Path $env:TEMP 'swa-mes-oee'
if (Test-Path $destino) { Remove-Item -Recurse -Force $destino }
New-Item -ItemType Directory -Force $destino | Out-Null
foreach ($f in $publicar) {
    $ruta = Join-Path $origen $f
    if (-not (Test-Path $ruta)) { throw "Falta el fichero $f en $origen." }
    Copy-Item $ruta $destino
}

$token = az staticwebapp secrets list -n $swaNombre -g $swaGrupo --query "properties.apiKey" -o tsv
if (-not $token) { throw "No se pudo obtener el token de despliegue de $swaNombre." }

npx -y @azure/static-web-apps-cli@latest deploy $destino --deployment-token $token --env production

Remove-Item -Recurse -Force $destino

$dominio = az staticwebapp show -n $swaNombre -g $swaGrupo --query "defaultHostname" -o tsv
$servida = (Invoke-WebRequest "https://$dominio/index.html" -UseBasicParsing).Content |
    Select-String -Pattern "APP_VERSION = '([^']*)'" |
    ForEach-Object { $_.Matches[0].Groups[1].Value }
Write-Output "Publicado en https://$dominio - version servida: $servida"
