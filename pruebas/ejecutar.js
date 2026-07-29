// Lanza todas las pruebas de la app.  ->  node pruebas/ejecutar.js
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ficheros = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
let fallos = 0;

for (const f of ficheros) {
  process.stdout.write('── ' + f + '\n');
  try {
    const salida = execFileSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' });
    process.stdout.write(salida.trimEnd() + '\n\n');
  } catch (e) {
    process.stdout.write((e.stdout || '') + (e.stderr || '') + '\n');
    fallos++;
  }
}

if (fallos) {
  console.log(`${fallos} de ${ficheros.length} ficheros con fallos`);
  process.exit(1);
}
console.log(`${ficheros.length} ficheros de pruebas, todos OK`);
