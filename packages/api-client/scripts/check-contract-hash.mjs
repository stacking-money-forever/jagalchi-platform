import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const expected = '22772bb6f94308c01806de2c2ddc08e2447fc17a77526a2ece31e796e9d34c01';
const contract = new URL('../contract/openapi.json', import.meta.url);
const actual = createHash('sha256').update(await readFile(contract)).digest('hex');
if (actual !== expected) {
  throw new Error(`OpenAPI contract hash mismatch: expected ${expected}, received ${actual}`);
}
console.log(`OpenAPI contract verified: ${actual}`);
