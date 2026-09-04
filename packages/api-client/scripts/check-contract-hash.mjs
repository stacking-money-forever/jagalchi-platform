import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const expected = '4eac6f4879393e5561a017f86533db0bd7998e047d619ee1c263c5293a6c968d';
const contract = new URL('../contract/openapi.json', import.meta.url);
const actual = createHash('sha256').update(await readFile(contract)).digest('hex');
if (actual !== expected) {
  throw new Error(`OpenAPI contract hash mismatch: expected ${expected}, received ${actual}`);
}
console.log(`OpenAPI contract verified: ${actual}`);
