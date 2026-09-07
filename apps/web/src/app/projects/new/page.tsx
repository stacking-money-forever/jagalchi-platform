import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { TargetEntryWizard } from '@/features/target-entry/components/target-entry-wizard';
import { isEnabled } from '@/lib/feature-flags';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '프로젝트 실행 시작',
  description: '목표 공고에서 프로젝트 실행까지 이어지는 진입 흐름',
};

export default function NewProjectRunPage() {
  if (!isEnabled('PROJECT_RUNS_ENABLED') || !isEnabled('EVIDENCE_EXECUTION_ENABLED')) {
    notFound();
  }

  return (
    <AppShell activeTab="create">
      <div className="mx-auto w-full max-w-6xl py-6">
        <TargetEntryWizard />
      </div>
    </AppShell>
  );
}
