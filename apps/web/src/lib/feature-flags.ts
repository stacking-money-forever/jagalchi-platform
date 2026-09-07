export const FLAGS = {
  REALTIME_ENABLED: process.env.NEXT_PUBLIC_REALTIME_ENABLED === 'true',
  OAUTH_ENABLED: process.env.NEXT_PUBLIC_OAUTH_ENABLED !== 'false',
  EVIDENCE_EXECUTION_ENABLED: process.env.NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED === 'true',
  PROJECT_RUNS_ENABLED:
    process.env.NEXT_PUBLIC_PROJECT_RUNS_ENABLED !== 'false' &&
    (process.env.NEXT_PUBLIC_PROJECT_RUNS_ENABLED === 'true' ||
      (process.env.NEXT_PUBLIC_ENV === 'development' &&
        process.env.NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED === 'true' &&
        process.env.NEXT_PUBLIC_API_MOCKING !== 'true' &&
        process.env.NEXT_PUBLIC_E2E_MOCKING !== 'true')),
  PROOF_PROFILE_ENABLED: process.env.NEXT_PUBLIC_PROOF_PROFILE_ENABLED === 'true',
} as const;

export type FeatureFlag = keyof typeof FLAGS;

export function isEnabled(flag: FeatureFlag): boolean {
  return FLAGS[flag];
}
