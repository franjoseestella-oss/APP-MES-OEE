# APP MES OEE — LOGISNEXT Alertas móvil

Aplicación móvil de **alertas KPI** (dirección) y **alarmas de mantenimiento**
para el sistema MES/OEE de Logisnext. Un único archivo HTML, sin instalación
ni compilación, con el código de colores Logisnext HMI.

## Contenido

| Archivo | Descripción |
|---------|-------------|
| `index.html` | La aplicación completa (HTML + CSS + JS en un solo archivo) |

## Qué muestra

- **Producción** 📊 — OEE del turno actual en un indicador circular animado con
  estado (✔ OK / ⚠ Atención / ⛔ Crítico) y sparkline de evolución, Disponibilidad,
  Rendimiento y Calidad con barras de progreso, plan de producción del día con
  barra de avance, desviación, indicador de secuencia actual y listado de
  secuencias del día con su estado (completada / con NOK / en curso /
  pendiente, horas y unidades OK-NOK) — si el backend envía `secuencia_actual`
  y `secuencias` en el resumen —, y lista de alertas KPI activas ordenadas
  por severidad.
- **Mis alertas** 🎚 — cada usuario puede activar sus propios umbrales (OEE,
  Disponibilidad, Rendimiento, Calidad y desviación del plan). Un KPI
  personalizado se evalúa con el límite del usuario en lugar del que marca el
  servidor y genera alertas etiquetadas como «Personal». Se guarda por usuario
  en el dispositivo.
- **Calidad** 🛡 — comprobación de bastidores: escanea el código de barras con
  la cámara (o escríbelo a mano) y te dice el resultado de las pruebas de la
  jaula — ✔ OK / ⛔ NOK con tiempos de elevación/descenso medidos frente a los
  teóricos, operario y modelo — o «No realizado» si aún no se ha probado.
  Incluye el listado OK/NOK del día con filtros y **exportación a CSV**
  (se abre directo en Excel) de la fecha o rango que estés viendo.
  Requiere el backend con `kpi.secuencias` y el endpoint
  `/alerts/sequence-detail` (rama `claude/secuencias-calidad` de
  `MES-OEE-jaula`, ya en `main`).
- **Mantenimiento** 🔧 — alarmas y advertencias activas y registro de alarmas
  (`LOG_ALARMAS`) con filtros por estado y tipo, y hora relativa
  («hace 22 min») en cada registro.
- **Ajustes** ⚙️ — URL del servidor MES e ID de máquina (se guardan en el móvil),
  tema claro/oscuro/auto, mantener la pantalla encendida (para paneles fijos
  en planta), instalación como app, notificaciones push y aviso
  sonoro/vibración opcional cuando aparece una alarma activa nueva.

Extras: **modo panel de planta (Andon)** a pantalla completa con el OEE
gigante, reloj y ticker de alarmas para colgar una tablet/TV; **informe del
turno imprimible/PDF** con los gráficos del panel (evolución del OEE, anillo
de resultados, alarmas), KPIs, plan, secuencias y un análisis IA;
**envío por correo con el PDF ya adjunto**: la app genera el PDF y el
servidor lo manda por SMTP al destinatario que elijas (requiere las
variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`,
`SMTP_FROM` en el backend; si no están configuradas, la app ofrece
compartirlo con otra app); **asistente
MES/OEE** conectado al agente del backend; y comodidades:
desliza hacia abajo para refrescar, toca el gauge de OEE
para ver la evolución ampliada con media/mín/máx, comparte el resumen del
turno por WhatsApp/correo, busca por texto en el registro de alarmas, cierra
las fichas deslizándolas hacia abajo y, con la app instalada, el icono
muestra un globo con el número de alertas activas.

El **Panel** incluye además la gráfica de los **últimos 7 días** (OK/NOK por
día con la calidad media de la semana), construida con el endpoint
`/alerts/sequences` por rango de fechas.

Los datos se actualizan automáticamente cada 30 segundos (en pausa cuando la
app está en segundo plano; al volver a primer plano o recuperar la red se
refresca al instante). El botón ↻ de la cabecera fuerza una actualización.
El *service worker* cachea la interfaz y la app guarda los últimos datos en
el dispositivo: **sin conexión abre igualmente** mostrando los datos
guardados (con aviso de su antigüedad) hasta recuperar el servidor. Con la
app instalada hay **accesos directos** (pulsación larga del icono) al Panel,
a Calidad y al modo Andon, y avisa con un toast cuando se instala una
versión nueva.

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

## Identidad corporativa (logisnext.eu)

| Color | Uso |
|-------|-----|
| `#56737F` azul pizarra | Marca: cabecera, botones, navegación activa |
| `#40565F` azul oscuro | Tono de apoyo de la marca |
| `#189D54` verde | Pruebas OK / Execute |
| `#C77F00` ámbar | Advertencia / espera |
| `#D63A45` rojo | Alarma / crítico |
| `#EFF2F3` / `#FFFFFF` | Fondo / tarjeta (tema claro como la web) |
| `#263942` azul grisáceo | Texto |

Tipografía: **Archivo** (Google Fonts) con reserva de fuentes del sistema.
Wordmark «Logisnext» en blanco sobre el cabecero azul, como en la web.
