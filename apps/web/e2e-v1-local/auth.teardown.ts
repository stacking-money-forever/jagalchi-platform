import { cleanupSeedAuthArtifacts } from './auth-state';

export default async function globalTeardown() {
  cleanupSeedAuthArtifacts();
}
