// Prueba el codigo numerico del QR (AAMM + secuencia) contra los datos REALES
// de julio de 2026 traidos de la base de datos.
const fs = require('fs');
const vm = require('vm');

const RUTA = require('path').join(__dirname, '..', 'index.html');
const html = fs.readFileSync(RUTA, 'utf8');
const codigo = html.slice(
  html.indexOf('function seqMatches(s, code)'),
  html.indexOf("document.getElementById('scan-code').addEventListener"),
);

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

// ── Datos reales de julio 2026 sacados de JAULA_ERP + LOG_TABLA ──────────────
const JULIO = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'datos-julio.json'), 'utf8'));

let llamadas = [];
const ctx = {
  document: { getElementById: id => (nodos[id] = nodos[id] || el()) },
  console,
  api: async (ruta, p) => {
    llamadas.push(ruta + ' ' + JSON.stringify(p));
    if (ruta === '/sequences') {
      if (p.desde && p.hasta) {
        return { secuencias: JULIO.filter(r => r.fecha >= p.desde && r.fecha <= p.hasta) };
      }
      return { secuencias: JULIO.filter(r => r.fecha === p.fecha) };
    }
    if (ruta === '/sequence-detail') {
      const r = JULIO.find(x => x.bastidor.toUpperCase() === String(p.bastidor).toUpperCase());
      if (!r) throw new Error('HTTP 404');
      return { bastidor: r.bastidor, modelo: r.modelo, estado: r.resultado || null, operario: r.operario };
    }
    throw new Error('HTTP 404');
  },
};
vm.createContext(ctx);
vm.runInContext(previo + codigo, ctx);

let fallos = 0;
const comprobar = (n, ok, d) => {
  console.log((ok ? '  OK   ' : '  FALLO') + '  ' + n + (d ? '  -> ' + d : ''));
  if (!ok) fallos++;
};
const estadoMostrado = () => (nodos['scan-result'].innerHTML.match(/font-size:22px">([^<]*)/) || [])[1];

(async () => {
  console.log('Codigo real del QR:');
  const c = ctx.interpretarCodigo('26070248');
  comprobar('26070248 -> primer corte: julio 2026 + secuencia 248',
    c.numericos[0] && c.numericos[0].mes === '202607' && c.numericos[0].secuencia === '248',
    JSON.stringify(c.numericos));

  llamadas = [];
  await ctx.doBuscar('26070248');
  comprobar('encuentra el bastidor ST13H-50084', nodos['scan-code'].value === 'ST13H-50084', nodos['scan-code'].value);
  comprobar('lo da por REALIZADO (OK), no por pendiente',
    (estadoMostrado() || '').includes('OK — pruebas superadas'), estadoMostrado());
  comprobar('barre el mes entero de julio', llamadas.some(l => l.includes('"desde":"202607')), llamadas[0]);

  console.log('\nOtras secuencias del mismo mes:');
  for (const [cod, esperado] of [['26070245', 'SF14H-50291'], ['26070250', 'SF34B-40022'], ['26070233', 'SF14H-00290']]) {
    await ctx.doBuscar(cod);
    comprobar(cod + ' -> ' + esperado, nodos['scan-code'].value === esperado,
      nodos['scan-code'].value + ' / ' + estadoMostrado());
  }

  console.log('\nCasos limite:');
  await ctx.doBuscar('26070999');
  comprobar('secuencia inexistente -> avisa sin registro',
    nodos['scan-result'].innerHTML.includes('Sin registro para este código'), estadoMostrado());

  const c13 = ctx.interpretarCodigo('26130248');
  comprobar('mes 13 no se acepta como codigo numerico', c13.numericos.length === 0);

  await ctx.doBuscar('ST13H-50084');
  comprobar('el bastidor escrito a mano sigue funcionando',
    (estadoMostrado() || '').includes('OK — pruebas superadas'), estadoMostrado());

  comprobar('febrero no pide el dia 31', ctx.ultimoDiaMes('202602') === '28', ctx.ultimoDiaMes('202602'));

  console.log(fallos === 0 ? '\nTODAS LAS PRUEBAS OK' : `\n${fallos} FALLOS`);
  process.exit(fallos === 0 ? 0 : 1);
})();
