'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { listProfileCorrectionLabels } from '../lib/confirm-payload';

import type { CompetencyAction, ProfileReviewDraft } from '../lib/confirm-payload';
import type { ProfileFindingView, ProfileRepositoryView } from '../lib/snapshot-payload';

export function ProfileReviewSection({
  repositories,
  findings,
  draft,
  onChange,
  onConfirm,
  busy = false,
}: {
  repositories: ProfileRepositoryView[];
  findings: ProfileFindingView[];
  draft: ProfileReviewDraft;
  onChange: (next: ProfileReviewDraft) => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const observed = findings.filter((item) => item.status === 'OBSERVED');
  const inferred = findings.filter((item) => item.status === 'INFERRED');
  const correctionLabels = listProfileCorrectionLabels(findings, draft);

  const toggleRepository = (repositoryId: string) => {
    const selected = new Set(draft.acceptedRepositoryIds);
    if (selected.has(repositoryId)) {
      selected.delete(repositoryId);
    } else {
      selected.add(repositoryId);
    }
    onChange({ ...draft, acceptedRepositoryIds: [...selected] });
  };

  const setCompetencyAction = (findingId: string, action: CompetencyAction | undefined) => {
    onChange({
      ...draft,
      competencyActions: { ...draft.competencyActions, [findingId]: action },
    });
  };

  const setCompetencyNote = (findingId: string, note: string) => {
    onChange({
      ...draft,
      competencyNotes: { ...draft.competencyNotes, [findingId]: note },
    });
  };

  return (
    <section className="space-y-4" aria-busy={busy}>
      <h2 className="text-lg font-bold">GitHub 증거 스냅샷 검토</h2>

      {repositories.length > 0 ? (
        <div className="border-border rounded-xl border p-4">
          <h3 className="font-semibold">연결된 저장소</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {repositories.map((repo) => {
              const checked = draft.acceptedRepositoryIds.includes(repo.id);
              return (
                <li key={repo.id} className="flex items-center gap-2">
                  <input
                    id={`repo-${repo.id}`}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRepository(repo.id)}
                  />
                  <label htmlFor={`repo-${repo.id}`}>{repo.fullName}</label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <SnapshotBucket title="관측된 사실" items={observed.map((item) => item.label)} />
        <div className="border-border space-y-3 rounded-xl border p-4">
          <h3 className="font-semibold">추론된 역량</h3>
          {inferred.length === 0 ? (
            <p className="text-muted-foreground text-sm">항목 없음</p>
          ) : (
            <ul className="space-y-3">
              {inferred.map((finding) => (
                <li key={finding.id} className="space-y-2 rounded-lg border p-3 text-sm">
                  <p className="font-medium">{finding.label}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={
                        draft.competencyActions[finding.id] === 'ACCEPT' ? 'solid' : 'outline'
                      }
                      onClick={() => setCompetencyAction(finding.id, 'ACCEPT')}
                    >
                      수락
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        draft.competencyActions[finding.id] === 'REJECT' ? 'solid' : 'outline'
                      }
                      onClick={() => setCompetencyAction(finding.id, 'REJECT')}
                    >
                      제외
                    </Button>
                  </div>
                  <Input
                    placeholder="보정 메모 (선택)"
                    value={draft.competencyNotes[finding.id] ?? ''}
                    onChange={(event) => setCompetencyNote(finding.id, event.target.value)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-primary/30 bg-primary-subtle rounded-xl border p-4">
        <h3 className="font-semibold">사용자 보정</h3>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4 text-sm">
          {correctionLabels.length > 0 ? (
            correctionLabels.map((item) => <li key={item}>{item}</li>)
          ) : (
            <li>아직 보정 없음 — 추론 역량을 수락/제외하거나 메모를 남기면 여기에 표시됩니다.</li>
          )}
        </ul>
      </div>

      <Button disabled={busy} onClick={onConfirm}>
        증거 스냅샷 확인
      </Button>
    </section>
  );
}

function SnapshotBucket({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border-border rounded-xl border p-4">
      <h3 className="font-semibold">{title}</h3>
      <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4 text-sm">
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>항목 없음</li>}
      </ul>
    </div>
  );
}
