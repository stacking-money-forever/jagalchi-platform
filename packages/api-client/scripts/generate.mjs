import { readFile, writeFile } from 'node:fs/promises';

import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript';

const input = JSON.parse(await readFile(new URL('../contract/openapi.json', import.meta.url), 'utf8'));

const nodes = await openapiTS(input);
const output = `${COMMENT_HEADER}${astToString(nodes)}`;
const destination = new URL('../src/schema.generated.ts', import.meta.url);
if (process.argv.includes('--check')) {
  const current = await readFile(destination, 'utf8');
  if (current !== output) throw new Error('Generated OpenAPI types are stale; run pnpm generate');
} else {
  await writeFile(destination, output);
}
