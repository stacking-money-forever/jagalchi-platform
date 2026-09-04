'use client';

import {
  createApiTransport,
  getProjectRun,
  projectRunQueryKey,
  type ProjectRunProjection,
} from '@jagalchi/api-client';
import { useQuery } from '@tanstack/react-query';

import { ProjectRunWorkspace } from './project-run-workspace';

const transport = createApiTransport('/api', fetch);

export function ProjectRunLive({ initialRun }: { initialRun: ProjectRunProjection }) {
  const { data } = useQuery({
    queryKey: projectRunQueryKey(initialRun.id),
    queryFn: ({ signal }) => getProjectRun(transport, initialRun.id, signal),
    initialData: initialRun,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">프로젝트 실행 {data.id.slice(0, 8)}</h1>
        <span className="rounded-full border px-3 py-1 text-sm">{data.state}</span>
      </div>
      <ProjectRunWorkspace run={data} />
    </section>
  );
}
