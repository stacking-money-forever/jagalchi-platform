import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SEED_AUTH_STORAGE_FILE,
  cleanupSeedAuthArtifacts,
  defaultSeedAuthDir,
  ensureSeedAuthStorageDir,
  readSeedAuthCredentials,
  removeSeedAuthStorage,
  resolveSeedAuthStoragePath,
} from './auth-state';

describe('auth-state', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jagalchi-e2e-auth-'));
  });

  afterEach(() => {
    cleanupSeedAuthArtifacts(tempDir);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves the seed auth storage path under the auth directory', () => {
    expect(resolveSeedAuthStoragePath(tempDir)).toBe(path.join(tempDir, SEED_AUTH_STORAGE_FILE));
  });

  it('creates the auth directory with private permissions', () => {
    const authDir = ensureSeedAuthStorageDir(tempDir);
    const mode = fs.statSync(authDir).mode & 0o777;
    expect(mode).toBe(0o700);
  });

  it('removes persisted storage state without leaving the auth file behind', () => {
    const authDir = ensureSeedAuthStorageDir(tempDir);
    const storagePath = resolveSeedAuthStoragePath(authDir);
    fs.writeFileSync(storagePath, '{"cookies":[]}', 'utf8');

    removeSeedAuthStorage(authDir);
    expect(fs.existsSync(storagePath)).toBe(false);
  });

  it('cleans up empty auth directories after teardown', () => {
    const authDir = ensureSeedAuthStorageDir(tempDir);
    const storagePath = resolveSeedAuthStoragePath(authDir);
    fs.writeFileSync(storagePath, '{"cookies":[]}', 'utf8');

    cleanupSeedAuthArtifacts(authDir);
    expect(fs.existsSync(authDir)).toBe(false);
  });

  it('reads seed auth credentials from the environment', () => {
    vi.stubEnv('E2E_TEST_EMAIL', 'seed@example.test');
    vi.stubEnv('E2E_TEST_PASSWORD', 'seed-password');
    vi.stubEnv('E2E_SEED_USER_ID', '11111111-1111-4111-8111-111111111111');

    expect(readSeedAuthCredentials()).toEqual({
      email: 'seed@example.test',
      password: 'seed-password',
      userId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('fails closed when seed auth credentials are missing', () => {
    vi.unstubAllEnvs();
    expect(() => readSeedAuthCredentials()).toThrow(
      'E2E_TEST_EMAIL, E2E_TEST_PASSWORD, and E2E_SEED_USER_ID are required for seed auth setup',
    );
  });

  it('defaults the auth directory beside the harness module', () => {
    expect(defaultSeedAuthDir()).toMatch(/e2e-v1-local[/\\]\.auth$/);
  });
});
