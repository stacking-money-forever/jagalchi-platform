import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const expected = '0f531485f7417b3f12b184d3344b4ee6c352f85c8828e0df0733dd127af6568f';
const contract = new URL('../contract/openapi.json', import.meta.url);
const actual = createHash('sha256').update(await readFile(contract)).digest('hex');
if (actual !== expected) {
  throw new Error(`OpenAPI contract hash mismatch: expected ${expected}, received ${actual}`);
}
console.log(`OpenAPI contract verified: ${actual}`);
