import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const expected = '1795500141cc96b14dba7324d00995c83c6fcb98efaa0e72eb84912b346664a2';
const contract = new URL('../contract/openapi.json', import.meta.url);
const actual = createHash('sha256').update(await readFile(contract)).digest('hex');
if (actual !== expected) {
  throw new Error(`OpenAPI contract hash mismatch: expected ${expected}, received ${actual}`);
}
console.log(`OpenAPI contract verified: ${actual}`);
