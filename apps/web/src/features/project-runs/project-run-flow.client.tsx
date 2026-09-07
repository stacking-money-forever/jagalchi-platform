'use client';

import dynamic from 'next/dynamic';

import { ProjectRunSkeleton } from './session-renewal-boundary';

import type { ProjectRunProjection } from '@jagalchi/api-client';

const ClientOnlyFlow = dynamic(() => import('./project-run-flow'), {
  ssr: false,
  loading: () => <ProjectRunSkeleton label="작업 흐름을 준비하고 있어요" />,
});

export function ProjectRunFlowClient(props: { run: ProjectRunProjection }) {
  return <ClientOnlyFlow {...props} />;
}
