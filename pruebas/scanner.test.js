// Banco de pruebas del escaner: extrae las funciones reales de index.html y las
// ejecuta con DOM, camara y BarcodeDetector simulados.
const fs = require('fs');
const vm = require('vm');

const RUTA = require('path').join(__dirname, '..', 'index.html');
const html = fs.readFileSync(RUTA, 'utf8');
const ini = html.indexOf('let scanStream = null;');
const fin = html.indexOf('// ── CALIDAD: LISTADO OK / NOK');
if (ini < 0 || fin < 0) throw new Error('No se localizo el bloque del escaner');
const codigo = html.slice(ini, fin);

// ── Simulacion del DOM ────────────────────────────────────────────────────────
function clases() {
  const s = new Set();
  return {
    add: (...c) => c.forEach(x => s.add(x)),
    remove: (...c) => c.forEach(x => s.delete(x)),
    toggle: (c, on) => (on ? s.add(c) : s.delete(c)),
    contains: c => s.has(c),
    lista: () => [...s].sort().join(','),
  };
}
const el = (extra = {}) => Object.assign({
  classList: clases(), textContent: '', className: '', value: '', disabled: false,
  focus() {}, addEventListener() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
}, extra);

const nodos = {
  'scan-video': el({
    videoWidth: 1280, videoHeight: 720, srcObject: null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 380, height: 506.67 }),
  }),
  'scan-roi': el({ getBoundingClientRect: () => ({ left: 60.8, top: 124.1, width: 258.4, height: 258.4 }) }),
  'scan-viewport': el(),
  'scan-hint': el(),
  'scan-modal': el(),
  'scan-disparar': el(),
  'scan-code': el(),
  'scan-code2': el(),
  'scan-msg': el(),
};

let ultimoRecorte = null;
const document_ = {
  getElementById: id => nodos[id] || el(),
  createElement: () => ({
    width: 0, height: 0,
    getContext: () => ({
      drawImage: (v, x, y, w, h) => { ultimoRecorte = { x, y, w, h }; },
    }),
  }),
};

// ── Simulacion de camara y lector ─────────────────────────────────────────────
let capacidades = { focusMode: ['continuous', 'single-shot'] };
let enfoquesPedidos = [];
let paradas = 0;
const pista = {
  getCapabilities: () => capacidades,
  applyConstraints: async c => { enfoquesPedidos.push(c.advanced[0].focusMode); },
  stop: () => { paradas++; },
};
const navigator_ = {
  mediaDevices: { getUserMedia: async () => ({ getVideoTracks: () => [pista], getTracks: () => [pista] }) },
  vibrate: () => {},
};

let qrPresente = null;      // null = no hay QR | string = valor del QR
let retrasoDetect = 0;
class BarcodeDetectorFake {
  constructor() {}
  async detect() {
    if (retrasoDetect) await new Promise(r => setTimeout(r, retrasoDetect));
    return qrPresente ? [{ format: 'qr_code', rawValue: qrPresente }] : [];
  }
}

let buscados = [];
const ctx = {
  document: document_, navigator: navigator_,
  window: { BarcodeDetector: BarcodeDetectorFake },   // el codigo comprueba 'BarcodeDetector' in window
  BarcodeDetector: BarcodeDetectorFake,
  setInterval, clearInterval, setTimeout, clearTimeout, console,
  doBuscar: v => buscados.push(v),
};
vm.createContext(ctx);
vm.runInContext(codigo, ctx);

// ── Utilidades de prueba ──────────────────────────────────────────────────────
const espera = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
function comprobar(nombre, ok, detalle) {
  console.log((ok ? '  OK   ' : '  FALLO') + '  ' + nombre + (detalle ? '  -> ' + detalle : ''));
  if (!ok) fallos++;
}

(async () => {
  // 1. Apertura: enfoque continuo pedido, sin leer nada
  qrPresente = null;
  await ctx.startScan();
  comprobar('al abrir pide enfoque continuo', enfoquesPedidos.includes('continuous'), enfoquesPedidos.join(','));
  comprobar('al abrir no busca nada', buscados.length === 0);
  comprobar('modal abierto', nodos['scan-modal'].classList.contains('open'));

  // 2. Con QR delante: avisa y NO dispara solo
  qrPresente = 'BAST-0421';
  await espera(700);
  comprobar('avisa de que el QR esta a la vista', nodos['scan-viewport'].classList.contains('listo'));
  comprobar('el aviso es verde', nodos['scan-hint'].className.includes('ok'), nodos['scan-hint'].textContent);
  comprobar('sigue SIN buscar por su cuenta', buscados.length === 0);

  // 3. El recorte cae donde esta el recuadro
  comprobar('recorta la zona del recuadro y no el fotograma entero',
    ultimoRecorte && ultimoRecorte.w < 1280 && Math.abs((ultimoRecorte.x + ultimoRecorte.w / 2) - 640) < 1,
    ultimoRecorte && `x=${Math.round(ultimoRecorte.x)} w=${Math.round(ultimoRecorte.w)}`);

  // 4. Disparo con QR: busca y cierra
  await ctx.dispararScan();
  comprobar('al disparar busca el codigo', buscados.length === 1 && buscados[0] === 'BAST-0421', buscados.join(','));
  comprobar('al disparar cierra la camara', paradas === 1 && !nodos['scan-modal'].classList.contains('open'));

  // 5. Disparo sin QR: avisa y deja seguir
  buscados = []; qrPresente = null; enfoquesPedidos = [];
  await ctx.startScan();
  await ctx.dispararScan();
  comprobar('sin QR no busca nada', buscados.length === 0);
  comprobar('sin QR avisa en rojo', nodos['scan-hint'].className.includes('fail'), nodos['scan-hint'].textContent);
  comprobar('sin QR el boton vuelve a estar activo', nodos['scan-disparar'].disabled === false);
  comprobar('sin QR la camara sigue abierta', nodos['scan-modal'].classList.contains('open'));

  // 6. Sin enfoque continuo: al ver el QR pide enfoque puntual
  ctx.stopScan();
  capacidades = { focusMode: ['single-shot'] };
  enfoquesPedidos = []; qrPresente = null;
  await ctx.startScan();
  qrPresente = 'SEQ-118';
  await espera(700);
  comprobar('si no hay continuo, enfoca al ver el QR', enfoquesPedidos.includes('single-shot'), enfoquesPedidos.join(','));

  // 7. Carrera: vigilancia lenta en vuelo mientras se dispara
  buscados = []; retrasoDetect = 400;
  const vig = ctx.vigilarROI();            // se queda esperando el detect
  await espera(50);
  const disp = ctx.dispararScan();         // el operario dispara mientras tanto
  await Promise.all([vig, disp]);
  comprobar('la vigilancia no pisa al disparo', buscados.length === 1 && buscados[0] === 'SEQ-118', buscados.join(','));
  retrasoDetect = 0;

  // 8. Cerrar deja todo parado
  ctx.stopScan();
  const antes = paradas;
  await espera(700);
  comprobar('al cerrar se apaga la camara y la vigilancia', paradas === antes && !nodos['scan-modal'].classList.contains('open'));

  console.log(fallos === 0 ? '\nTODAS LAS PRUEBAS OK' : `\n${fallos} FALLOS`);
  process.exit(fallos === 0 ? 0 : 1);
})();
