// Re-read the sync barcode of recorded takes: node capture/redecode.mjs a b c …
import { readFileSync, writeFileSync } from 'node:fs';
import { decodeBarcode, REC } from './rec-lib.mjs';

for (const take of process.argv.slice(2)) {
  const file = `${REC}${take}.marks.json`;
  const j = JSON.parse(readFileSync(file, 'utf8'));
  for (const m of j.marks) { delete m.tv; delete m.lag; delete m.guess; }
  j.sync = decodeBarcode(`${REC}${take}.mp4`, j.marks);
  writeFileSync(file, JSON.stringify(j, null, 2));
  console.log(take, JSON.stringify(j.sync));
}
