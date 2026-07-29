// Prueba reengancharPush(): simula el navegador (service worker + pushManager)
// y un backend que pierde las suscripciones al reiniciarse.
const fs = require('fs');
const vm = require('vm');

const RUTA = require('path').join(__dirname, '..', 'index.html');
const html = fs.readFileSync(RUTA, 'utf8');
const codigo = html.slice(
  html.indexOf('// ── PUSH: REENGANCHE AUTOMÁTICO ──'),
  html.indexOf('// ── ASISTENTE MES/OEE'),
);

// ── Servidor simulado ────────────────────────────────────────────────────────
const servidor = { clave: 'CLAVE-A', suscripciones: [] };
const reiniciarConservandoClaves = () => { servidor.suscripciones = []; };
const reiniciarSinClaves = () => { servidor.suscripciones = []; servidor.clave = 'CLAVE-B'; };

// ── Navegador simulado ───────────────────────────────────────────────────────
const navegador = { permiso: 'granted', sub: null, desuscripciones: 0 };
const nuevaSub = clave => ({
  endpoint: 'https://push.example/' + clave + '/abc',
  toJSON() { return { endpoint: this.endpoint, keys: {} }; },
  unsubscribe: async () => { navegador.desuscripciones++; navegador.sub = null; return true; },
});

const almacen = {};
const ctx = {
  console,
  localStorage: {
    getItem: k => (k in almacen ? almacen[k] : null),
    setItem: (k, v) => { almacen[k] = String(v); },
    removeItem: k => { delete almacen[k]; },
  },
  pushSupported: () => true,
  cfg: () => ({ url: 'https://servidor' }),
  getSession: () => ({ token: 'T' }),
  authHeaders: e => e || {},
  urlBase64ToUint8Array: s => s,
  get Notification() { return { permission: navegador.permiso }; },
  navigator: {
    serviceWorker: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: async () => navegador.sub,
          subscribe: async o => { navegador.sub = nuevaSub(o.applicationServerKey); return navegador.sub; },
        },
      }),
    },
  },
  fetch: async (url, opts) => {
    if (url.endsWith('/vapid-public-key')) {
      return { ok: true, json: async () => ({ public_key: servidor.clave }) };
    }
    if (url.endsWith('/push/subscribe')) {
      const body = JSON.parse(opts.body);
      servidor.suscripciones = servidor.suscripciones.filter(s => s.endpoint !== body.endpoint);
      servidor.suscripciones.push(body);
      return { ok: true, json: async () => ({}) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  },
};
vm.createContext(ctx);
vm.runInContext(codigo, ctx);

let fallos = 0;
const comprobar = (n, ok, d) => {
  console.log((ok ? '  OK   ' : '  FALLO') + '  ' + n + (d ? '  -> ' + d : ''));
  if (!ok) fallos++;
};

(async () => {
  // Estado de partida: el operario activó push en su dia
  almacen['ln_push_on'] = '1';
  almacen['ln_push_key'] = 'CLAVE-A';
  navegador.sub = nuevaSub('CLAVE-A');
  servidor.suscripciones = [navegador.sub.toJSON()];

  // 1. Reinicio del backend: pierde la lista de suscritos (claves fijas)
  reiniciarConservandoClaves();
  comprobar('tras el reinicio el servidor no tiene a nadie', servidor.suscripciones.length === 0);
  await ctx.reengancharPush();
  comprobar('al abrir la app se vuelve a registrar sola', servidor.suscripciones.length === 1,
    servidor.suscripciones[0] && servidor.suscripciones[0].endpoint);
  comprobar('no hace falta rehacer la suscripcion del navegador', navegador.desuscripciones === 0);

  // 2. Reinicio perdiendo tambien las claves VAPID
  reiniciarSinClaves();
  await ctx.reengancharPush();
  comprobar('si cambia la clave del servidor, rehace la suscripcion', navegador.desuscripciones === 1);
  comprobar('y la registra con la clave nueva',
    servidor.suscripciones.length === 1 && servidor.suscripciones[0].endpoint.includes('CLAVE-B'),
    servidor.suscripciones[0] && servidor.suscripciones[0].endpoint);
  comprobar('guarda la clave nueva para la proxima vez', almacen['ln_push_key'] === 'CLAVE-B');

  // 3. Idempotente: llamarlo otra vez no duplica
  await ctx.reengancharPush();
  comprobar('llamarlo de nuevo no duplica suscripciones', servidor.suscripciones.length === 1);

  // 4. Si el operario nunca activo push, no se toca nada
  delete almacen['ln_push_on'];
  servidor.suscripciones = [];
  await ctx.reengancharPush();
  comprobar('sin push activado no registra nada', servidor.suscripciones.length === 0);

  // 5. Sin permiso del navegador no se intenta resuscribir
  almacen['ln_push_on'] = '1';
  almacen['ln_push_key'] = 'CLAVE-VIEJA';
  navegador.sub = nuevaSub('CLAVE-VIEJA');
  navegador.permiso = 'denied';
  const antes = navegador.desuscripciones;
  await ctx.reengancharPush();
  comprobar('sin permiso no deja una suscripcion a medias',
    servidor.suscripciones.length === 0 && navegador.desuscripciones === antes + 1);

  console.log(fallos === 0 ? '\nTODAS LAS PRUEBAS OK' : `\n${fallos} FALLOS`);
  process.exit(fallos === 0 ? 0 : 1);
})();
