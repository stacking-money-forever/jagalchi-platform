import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export const SEED_AUTH_STORAGE_FILE = 'seed-user.json';

export function defaultSeedAuthDir(): string {
  return path.join(moduleDir, '.auth');
}

export function resolveSeedAuthStoragePath(authDir = defaultSeedAuthDir()): string {
  return path.join(authDir, SEED_AUTH_STORAGE_FILE);
}

export function ensureSeedAuthStorageDir(authDir = defaultSeedAuthDir()): string {
  fs.mkdirSync(authDir, { recursive: true, mode: 0o700 });
  return authDir;
}

export function removeSeedAuthStorage(authDir = defaultSeedAuthDir()): void {
  const storagePath = resolveSeedAuthStoragePath(authDir);
  if (fs.existsSync(storagePath)) {
    fs.rmSync(storagePath, { force: true });
  }
}

export function cleanupSeedAuthArtifacts(authDir = defaultSeedAuthDir()): void {
  removeSeedAuthStorage(authDir);
  if (fs.existsSync(authDir) && fs.readdirSync(authDir).length === 0) {
    fs.rmdirSync(authDir);
  }
}

export function readSeedAuthCredentials(): {
  email: string;
  password: string;
  userId: string;
} {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  const userId = process.env.E2E_SEED_USER_ID;
  if (!email || !password || !userId) {
    throw new Error(
      'E2E_TEST_EMAIL, E2E_TEST_PASSWORD, and E2E_SEED_USER_ID are required for seed auth setup',
    );
  }
  return { email, password, userId };
}
