# APP MES OEE — LOGISNEXT Alertas móvil

Aplicación móvil de **alertas KPI** (dirección) y **alarmas de mantenimiento**
para el sistema MES/OEE de Logisnext. Un único archivo HTML, sin instalación
ni compilación, con el código de colores Logisnext HMI.

## Contenido

| Archivo | Descripción |
|---------|-------------|
| `index.html` | La aplicación completa (HTML + CSS + JS en un solo archivo) |

## Qué muestra

- **Dirección** 📊 — OEE del turno actual en un indicador circular animado con
  estado (✔ OK / ⚠ Atención / ⛔ Crítico) y sparkline de evolución, Disponibilidad,
  Rendimiento y Calidad con barras de progreso, plan de producción del día con
  barra de avance, desviación e indicador de secuencia actual (si el backend
  envía `secuencia_actual` en el resumen), y lista de alertas KPI activas ordenadas por
  severidad.
- **Mis alertas** 🎚 — cada usuario puede activar sus propios umbrales (OEE,
  Disponibilidad, Rendimiento, Calidad y desviación del plan). Un KPI
  personalizado se evalúa con el límite del usuario en lugar del que marca el
  servidor y genera alertas etiquetadas como «Personal». Se guarda por usuario
  en el dispositivo.
- **Mantenimiento** 🔧 — alarmas y advertencias activas y registro de alarmas
  (`LOG_ALARMAS`) con filtros por estado y tipo, y hora relativa
  («hace 22 min») en cada registro.
- **Ajustes** ⚙️ — URL del servidor MES e ID de máquina (se guardan en el móvil),
  notificaciones push y aviso sonoro/vibración opcional cuando aparece una
  alarma activa nueva con la app abierta.

Los datos se actualizan automáticamente cada 30 segundos (en pausa cuando la
app está en segundo plano; al volver a primer plano o recuperar la red se
refresca al instante). El botón ↻ de la cabecera fuerza una actualización.
El *service worker* cachea la interfaz, así que la app abre incluso sin
conexión (mostrando el aviso de «Sin conexión» hasta recuperar el servidor).

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
| `#34D877` verde | OK / Execute |
| `#FFB020` ámbar | Advertencia / espera |
| `#FF3B4D` rojo | Alarma / crítico |
| `#2BD9E5` cian | Datos / acento |
| `#060A10` / `#0D1219` | Fondo / tarjeta |
| `#8B94A6` gris | Etiquetas |
