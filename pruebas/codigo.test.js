// Prueba interpretarCodigo() y el flujo de doBuscar() con bastidores reales.
const fs = require('fs');
const vm = require('vm');

const RUTA = require('path').join(__dirname, '..', 'index.html');
const html = fs.readFileSync(RUTA, 'utf8');
const ini = html.indexOf('function seqMatches(s, code)');
const fin = html.indexOf("document.getElementById('scan-code').addEventListener");
const codigo = html.slice(ini, fin);

// Dependencias que usa el bloque y viven en otras partes del fichero
const previo = `
function esc(s){return String(s??'-');}
function ymd(d){return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');}
function seqBastidor(s){return s.bastidor ?? s.nbastidor ?? s.codigo ?? s.numero ?? s.id;}
function seqEstado(s){
  if (s.en_curso) return 'curso';
  const r = String(s.resultado ?? s.ok_nok ?? '').trim().toUpperCase();
  if (r === 'OK') return 'done';
  if (r === 'NOK') return 'nok';
  return 'pend';
}
function openSeqSheet(){}
function pushReciente(){}
let lastSeqs = null;
`;

const nodos = {};
const el = () => ({ textContent: '', className: '', innerHTML: '', value: '' });
['scan-code', 'scan-msg', 'scan-result'].forEach(id => (nodos[id] = el()));

let llamadas = [];
const ctx = {
  document: { getElementById: id => (nodos[id] = nodos[id] || el()) },
  console,
  api: async (ruta, params) => {
    llamadas.push(ruta + ' ' + JSON.stringify(params));
    return SERVIDOR(ruta, params);
  },
};
let SERVIDOR = async () => { throw new Error('404'); };
vm.createContext(ctx);
vm.runInContext(previo + codigo, ctx);

let fallos = 0;
const comprobar = (nombre, ok, detalle) => {
  console.log((ok ? '  OK   ' : '  FALLO') + '  ' + nombre + (detalle ? '  -> ' + detalle : ''));
  if (!ok) fallos++;
};

// ── 1. Lectura del QR ────────────────────────────────────────────────────────
console.log('interpretarCodigo():');
const casos = [
  ['SF14H-50291',                                  { bastidor: 'SF14H-50291', fecha: null, secuencia: null }],
  ['SFB09E704789',                                 { bastidor: 'SFB09E704789', fecha: null, secuencia: null }],
  ['STB310703433',                                 { bastidor: 'STB310703433', fecha: null, secuencia: null }],
  ['SF14H-50291;20260727;0245',                    { bastidor: 'SF14H-50291', fecha: '20260727', secuencia: '245' }],
  ['20260727|0245|SF14H-50291|FDE35AT',            { bastidor: 'SF14H-50291', fecha: '20260727', secuencia: '245' }],
  ['BASTIDOR=SF14H-50291\nFECHA=2026-07-27\nSEC=0245', { bastidor: 'SF14H-50291', fecha: '20260727', secuencia: '245' }],
  ['27/07/2026 0245 SF14H-50291',                  { bastidor: 'SF14H-50291', fecha: '20260727', secuencia: '245' }],
  ['20260727 0245',                                { bastidor: null, fecha: '20260727', secuencia: '245' }],
  ['sf14h-50291',                                  { bastidor: 'SF14H-50291', fecha: null, secuencia: null }],
];
for (const [entrada, esperado] of casos) {
  const r = ctx.interpretarCodigo(entrada);
  const ok = r.bastidor === esperado.bastidor && r.fecha === esperado.fecha && r.secuencia === esperado.secuencia;
  comprobar(JSON.stringify(entrada).slice(0, 46), ok, `bast=${r.bastidor} fecha=${r.fecha} sec=${r.secuencia}`);
}

// La fecha nunca debe colarse como secuencia ni como bastidor
const soloFecha = ctx.interpretarCodigo('20260727');
comprobar('una fecha sola no se toma por secuencia', soloFecha.secuencia === null && soloFecha.fecha === '20260727');

// ── 2. Flujo de busqueda ─────────────────────────────────────────────────────
console.log('\ndoBuscar():');
const DIA = [{ secuencia: '0245', bastidor: 'SF14H-50291', modelo: 'FDE35AT', resultado: 'OK' }];

(async () => {
  // a) QR con varios campos: encuentra por el bastidor extraido
  SERVIDOR = async (ruta, p) => {
    if (ruta === '/sequences') return { secuencias: DIA };
    if (ruta === '/sequence-detail' && p.bastidor === 'SF14H-50291') {
      return { bastidor: 'SF14H-50291', modelo: 'FDE35AT', estado: 'OK', tiempo_real_elevacion_s: 4.2 };
    }
    throw new Error('404');
  };
  llamadas = [];
  await ctx.doBuscar('20260727|0245|SF14H-50291|FDE35AT');
  comprobar('QR con varios campos -> sale el resultado OK',
    nodos['scan-result'].innerHTML.includes('OK — pruebas superadas'),
    nodos['scan-result'].innerHTML.match(/font-size:22px">([^<]*)/)?.[1]);
  comprobar('busca por el bastidor extraido, no por el QR entero',
    llamadas.some(l => l.includes('"bastidor":"SF14H-50291"')), llamadas.join(' | '));

  llamadas = [];
  await ctx.doBuscar('FECHA=20260727;SEC=0245');
  comprobar('QR con fecha+secuencia -> resuelve el bastidor y sale OK',
    nodos['scan-result'].innerHTML.includes('OK — pruebas superadas'),
    nodos['scan-code'].value);
  comprobar('consulta el listado del dia de la fecha del QR',
    llamadas.some(l => l.startsWith('/sequences') && l.includes('20260727')), llamadas.join(' | '));

  // c) Codigo desconocido: avisa y enseña lo leido
  SERVIDOR = async () => { throw new Error('404'); };
  await ctx.doBuscar('CHORIZO-QUE-NO-EXISTE-123');
  comprobar('codigo desconocido -> avisa sin registro',
    nodos['scan-result'].innerHTML.includes('Sin registro para este código'));

  // d) El bastidor pelado de siempre sigue funcionando
  SERVIDOR = async (ruta, p) => {
    if (ruta === '/sequence-detail' && p.bastidor === 'SFB09E704789') {
      return { bastidor: 'SFB09E704789', modelo: 'MX230C', estado: 'NOK' };
    }
    throw new Error('404');
  };
  await ctx.doBuscar('SFB09E704789');
  comprobar('el bastidor pelado sigue funcionando (NOK)',
    nodos['scan-result'].innerHTML.includes('NOK — pruebas falladas'));

  console.log(fallos === 0 ? '\nTODAS LAS PRUEBAS OK' : `\n${fallos} FALLOS`);
  process.exit(fallos === 0 ? 0 : 1);
})();
