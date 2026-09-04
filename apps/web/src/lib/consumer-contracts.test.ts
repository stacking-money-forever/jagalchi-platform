import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const checker = path.resolve(import.meta.dirname, '../../scripts/check-consumer-contracts.mjs');
const temporaryDirectories: string[] = [];

async function runChecker(source: string) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'jagalchi-consumer-contracts-'));
  temporaryDirectories.push(directory);
  await writeFile(path.join(directory, 'consumer.ts'), source);
  return spawnSync(process.execPath, [checker, directory], { encoding: 'utf8' });
}

describe('consumer contract zero-gate', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
    );
  });

  it.each([
    "runAiJob('coaching', { question: 'next?' });",
    "getLearningCoach({ question: 'legacy' });",
    "fetch('/uploads/attachments');",
  ])('rejects a legacy consumer regression', async (source) => {
    const result = await runChecker(source);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Consumer contract regression');
  });
});
