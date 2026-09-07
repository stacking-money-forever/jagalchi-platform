import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const destination = await mkdtemp(join(tmpdir(), 'jagalchi-api-client-pack-'));
try {
  const output = execFileSync('pnpm', ['pack', '--pack-destination', destination, '--json'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });
  const { filename } = JSON.parse(output);
  const archive = filename.startsWith('/') ? filename : join(destination, filename);
  const entries = execFileSync('tar', ['-tf', archive], { encoding: 'utf8' });
  for (const required of ['package/package.json', 'package/dist/index.js', 'package/dist/index.d.ts', 'package/dist/schema.generated.d.ts']) {
    if (!entries.split('\n').includes(required)) throw new Error(`Packed artifact is missing ${required}`);
  }
} finally {
  await rm(destination, { recursive: true, force: true });
}
