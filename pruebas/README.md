# Pruebas de la app

Sin dependencias ni instalación: solo Node.js.

```bash
node pruebas/ejecutar.js
```

Cada fichero **extrae las funciones reales de `index.html`** y las ejecuta con
el navegador simulado (DOM, cámara, lector de QR, service worker y servidor).
No hay copias del código: si se cambia `index.html`, las pruebas prueban lo
nuevo o dejan de pasar.

| Fichero | Qué cubre |
|---------|-----------|
| `roi.test.js` | Geometría del recorte del escáner: que el recuadro que se ve en pantalla sea exactamente la zona que se lee, deshaciendo el `object-fit: cover`. Seis resoluciones de cámara. |
| `scanner.test.js` | Que el escáner **no dispara solo**: con un QR delante solo avisa y enfoca; la búsqueda la lanza el operario. Incluye la carrera entre la vigilancia y el disparo. |
| `codigo.test.js` | Interpretación del código leído: bastidor suelto, campos separados por `;` `|` o espacios, pares `CLAVE=valor`, y las tres formas de fecha. |
| `qr.test.js` | El código real del QR de la carretilla (`AAMM` + secuencia, p. ej. `26070248`) contra el listado de un mes. |
| `push.test.js` | Reenganche de las notificaciones cuando el servidor pierde la lista de suscritos o cambia la clave VAPID. |

`datos-julio.json` es un juego de datos **inventado** con el mismo formato que
`JAULA_ERP` (fecha de montaje, secuencia de 4 cifras que se repite de un mes a
otro, y bastidor). No lleva datos de producción ni nombres de operarios.

Las pruebas del backend van aparte, en el repositorio `MES-OEE-jaula`
(`python -m pytest tests/`).
