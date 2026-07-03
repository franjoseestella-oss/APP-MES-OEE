# APP MES OEE — LOGISNEXT Alertas móvil

Aplicación móvil de **alertas KPI** (dirección) y **alarmas de mantenimiento**
para el sistema MES/OEE de Logisnext. Un único archivo HTML, sin instalación
ni compilación, con el código de colores Logisnext HMI.

## Contenido

| Archivo | Descripción |
|---------|-------------|
| `index.html` | La aplicación completa (HTML + CSS + JS en un solo archivo) |

## Qué muestra

- **Dirección** 📊 — OEE del turno actual con estado (✔ OK / ⚠ Atención / ⛔ Crítico),
  Disponibilidad, Rendimiento y Calidad, plan de producción del día con desviación,
  y lista de alertas KPI activas ordenadas por severidad.
- **Mantenimiento** 🔧 — alarmas y advertencias activas y registro de alarmas
  (`LOG_ALARMAS`) con filtros por estado y tipo.
- **Ajustes** ⚙️ — URL del servidor MES e ID de máquina (se guardan en el móvil).

Los datos se actualizan automáticamente cada 30 segundos.

## Requisitos

- El backend MES/OEE (repositorio `MES-OEE-jaula`) ejecutándose con los endpoints
  `/api/v1/alerts/summary` y `/api/v1/alerts/maintenance` (rama
  `claude/kpi-maintenance-alerts-app-v8t6f2`).
- El móvil en la **misma red** que el servidor.

## Publicación en Vercel

1. En [vercel.com](https://vercel.com): *Sign in with GitHub* → **Add New →
   Project** → importa este repositorio (`APP-MES-OEE`).
2. Framework preset: **Other**. Sin build ni configuración → **Deploy**.
3. La app queda en `https://app-mes-oee.vercel.app` y se redespliega sola con
   cada commit.

## Conectar con el backend (HTTPS obligatorio)

Vercel sirve por HTTPS, así que el backend también debe ser accesible por
HTTPS (el navegador bloquea llamadas HTTP desde páginas HTTPS). El
`docker-compose.yml` del repositorio `MES-OEE-jaula` incluye el servicio
`cloudflared` que crea ese túnel:

```bash
docker-compose up -d cloudflared
docker logs mes_tunnel 2>&1 | grep trycloudflare
# → https://xxxx-yyyy.trycloudflare.com
```

Abre la app en el móvil → **Ajustes** → pega esa URL → **Guardar y probar
conexión**. Menú del navegador → **«Añadir a pantalla de inicio»** para tener
el icono como una app.

> La URL del quick tunnel cambia en cada arranque del túnel. Para una URL
> estable, crea un túnel con nombre en
> [Cloudflare Zero Trust](https://one.dash.cloudflare.com) (gratis) y usa
> `tunnel run --token TU_TOKEN` en el servicio cloudflared.

## Uso solo en red local (alternativa sin Vercel)

También puedes abrir `index.html` directamente en el móvil (envíatelo por
correo/USB) y en Ajustes poner la IP local del servidor
(p. ej. `http://192.168.1.50:8000`). Sin HTTPS ni túnel, pero solo funciona
dentro de la misma WiFi.

## Código de colores LOGISNEXT

| Color | Uso |
|-------|-----|
| `#2FD06A` verde | OK / Execute |
| `#F4A623` ámbar | Advertencia / espera |
| `#E32636` rojo | Alarma / crítico |
| `#25C9D6` cian | Datos |
| `#000000` / `#121212` | Fondo / tarjeta |
| `#8B92A0` gris | Etiquetas |
