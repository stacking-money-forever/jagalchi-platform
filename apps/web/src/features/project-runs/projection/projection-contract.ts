import type { ProjectRunProjection } from '@jagalchi/api-client';

/** G4 (forward): milestone titles on GET /project-runs/:id when BE adds them. */
export type ProjectRunMilestoneRef = {
  id: string;
  title: string;
};

/** G3 (forward): plan compile provenance on run projection when BE adds it. */
export type ProjectRunPlanProvenance = {
  model?: string;
  promptVersion?: string;
  inputHash?: string;
  generatedAt?: string;
};

export type ProjectRunPendingOperation = {
  id: string;
  kind: 'TASK_VERIFICATION' | 'PROOF_REVERIFICATION' | 'PULL_REQUEST_BINDING';
};

export type ProjectRunFailedCriterion = {
  ruleId: string;
  type: string;
  code: string;
};

export type ProjectRunTargetRef = {
  company?: string;
  role?: string;
};

export type ProjectRunProofEnvelope = NonNullable<ProjectRunProjection['proof']> & {
  failedCriteria?: ProjectRunFailedCriterion[];
  publication: NonNullable<ProjectRunProjection['proof']>['publication'] & {
    supersededSnapshotId?: string | null;
  };
};

/**
 * Forward-compatible projection envelope for Wave A.
 * Reads only GET /project-runs/:id — never plan snapshot fetches (G2/G4).
 */
export type ProjectRunProjectionEnvelope = ProjectRunProjection & {
  target?: ProjectRunTargetRef;
  milestones?: ProjectRunMilestoneRef[];
  planProvenance?: ProjectRunPlanProvenance;
  pendingOperation?: ProjectRunPendingOperation;
  proof?: ProjectRunProofEnvelope | null;
};
