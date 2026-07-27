// Replica la geometria de recorteROI() de index.html y comprueba que el recorte
// cae dentro del fotograma y centrado donde esta el recuadro en pantalla.
function recorte(rv, rr, videoWidth, videoHeight) {
  const escala = Math.max(rv.width / videoWidth, rv.height / videoHeight);
  const sobraX = (videoWidth * escala - rv.width) / 2;
  const sobraY = (videoHeight * escala - rv.height) / 2;
  const margen = 0.06;
  const anchoROI = rr.width * (1 + margen * 2);
  const altoROI = rr.height * (1 + margen * 2);
  const acotar = (v, min, max) => Math.max(min, Math.min(max, v));
  const x = acotar((rr.left - rv.left - rr.width * margen + sobraX) / escala, 0, videoWidth);
  const y = acotar((rr.top - rv.top - rr.height * margen + sobraY) / escala, 0, videoHeight);
  const w = acotar(anchoROI / escala, 1, videoWidth - x);
  const h = acotar(altoROI / escala, 1, videoHeight - y);
  return { x, y, w, h };
}

// Visor 3/4 como en el CSS, recuadro 68% del ancho y cuadrado, centrado.
function caso(anchoVisor, vw, vh) {
  const altoVisor = anchoVisor * 4 / 3;
  const rv = { left: 0, top: 0, width: anchoVisor, height: altoVisor };
  const lado = Math.min(anchoVisor * 0.68, altoVisor * 0.80);
  const rr = {
    left: (anchoVisor - lado) / 2,
    top: (altoVisor - lado) / 2,
    width: lado, height: lado,
  };
  const r = recorte(rv, rr, vw, vh);
  const centradoX = Math.abs((r.x + r.w / 2) - vw / 2) < 0.5;
  const centradoY = Math.abs((r.y + r.h / 2) - vh / 2) < 0.5;
  const dentro = r.x >= 0 && r.y >= 0 && r.x + r.w <= vw + 0.001 && r.y + r.h <= vh + 0.001;
  const cubre = (r.w / vw * 100).toFixed(0) + '%x' + (r.h / vh * 100).toFixed(0) + '%';
  console.log(
    `visor ${anchoVisor}px · camara ${vw}x${vh} -> recorte ${Math.round(r.w)}x${Math.round(r.h)}px ` +
    `(${cubre} del fotograma) | dentro:${dentro ? 'si' : 'NO'} centrado:${centradoX && centradoY ? 'si' : 'NO'}`
  );
  return dentro && centradoX && centradoY;
}

const casos = [
  [380, 1280, 720],   // stream apaisado tipico
  [380, 720, 1280],   // stream vertical
  [380, 640, 480],    // 4:3 apaisado
  [320, 1920, 1080],  // movil estrecho, camara full HD
  [380, 480, 640],    // 3:4 vertical: mismo aspecto que el visor
  [280, 1280, 960],
];
const ok = casos.map(c => caso(...c)).every(Boolean);
console.log(ok ? '\nTODOS OK' : '\nHAY FALLOS');
