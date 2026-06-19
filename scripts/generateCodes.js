// Script per generare i codici univoci da inviare ai membri del circolo.
//
// Uso:
//   node scripts/generateCodes.js nomi.txt
// dove nomi.txt contiene un nome per riga.
//
// Senza argomenti genera 3 codici di esempio.
//
// I codici vengono stampati a schermo e salvati anche in codici-generati.csv
// nella cartella backend, pronti per essere inviati via email a ciascun membro.

import 'dotenv/config';
import fs from 'node:fs';
import { pool } from '../src/db.js';

function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function main() {
  const fileArg = process.argv[2];
  let names;

  if (fileArg) {
    names = fs
      .readFileSync(fileArg, 'utf-8')
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);
  } else {
    names = ['Membro 1', 'Membro 2', 'Membro 3'];
    console.log('Nessun file fornito, genero 3 codici di esempio.');
    console.log('Uso: node scripts/generateCodes.js nomi.txt (un nome per riga)\n');
  }

  const results = [];
  for (const name of names) {
    let code;
    let inserted = false;
    while (!inserted) {
      code = generateCode();
      try {
        await pool.query('INSERT INTO members (code, name) VALUES (?, ?)', [
          code,
          name,
        ]);
        inserted = true;
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    results.push({ name, code });
  }

  console.log('Codici generati:\n');
  for (const r of results) {
    console.log(`${r.name.padEnd(25)} -> ${r.code}`);
  }

  const csv = ['nome,codice', ...results.map((r) => `${r.name},${r.code}`)].join(
    '\n'
  );
  fs.writeFileSync('codici-generati.csv', csv);
  console.log('\nSalvato anche in codici-generati.csv');

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
