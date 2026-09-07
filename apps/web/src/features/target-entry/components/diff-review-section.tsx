'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { listDiffCorrectionLabels } from '../lib/confirm-payload';

import type { DiffReviewDraft } from '../lib/confirm-payload';
import type { DiffGapView } from '../lib/snapshot-payload';

const STATUS_OPTIONS: DiffGapView['status'][] = ['OBSERVED', 'INFERRED', 'MISSING'];

export function DiffReviewSection({
  gaps,
  draft,
  onChange,
  onConfirm,
  busy = false,
}: {
  gaps: DiffGapView[];
  draft: DiffReviewDraft;
  onChange: (next: DiffReviewDraft) => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const observed = gaps.filter(
    (item) => (draft.gapStatuses[item.id] ?? item.status) === 'OBSERVED',
  );
  const inferred = gaps.filter(
    (item) => (draft.gapStatuses[item.id] ?? item.status) === 'INFERRED',
  );
  const missing = gaps.filter((item) => (draft.gapStatuses[item.id] ?? item.status) === 'MISSING');
  const correctionLabels = listDiffCorrectionLabels(gaps, draft);

  const setGapStatus = (gapId: string, status: DiffGapView['status']) => {
    onChange({
      ...draft,
      gapStatuses: { ...draft.gapStatuses, [gapId]: status },
    });
  };

  const setGapNote = (gapId: string, note: string) => {
    onChange({
      ...draft,
      gapNotes: { ...draft.gapNotes, [gapId]: note },
    });
  };

  return (
    <section className="space-y-4" aria-busy={busy}>
      <h2 className="text-lg font-bold">준비 상태 확인</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <SnapshotBucket title="관측" items={observed.map((item) => item.description)} />
        <SnapshotBucket title="추론" items={inferred.map((item) => item.description)} />
        <SnapshotBucket title="부족" items={missing.map((item) => item.description)} />
      </div>

      <div className="border-border space-y-3 rounded-xl border p-4">
        <h3 className="font-semibold">갭 보정</h3>
        {gaps.length === 0 ? (
          <p className="text-muted-foreground text-sm">갭 없음</p>
        ) : (
          <ul className="space-y-3">
            {gaps.map((gap) => (
              <li
                key={gap.id}
                className="grid gap-2 rounded-lg border p-3 text-sm md:grid-cols-[1fr_auto]"
              >
                <p className="font-medium">{gap.description}</p>
                <div className="flex flex-col gap-2 md:items-end">
                  <select
                    className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
                    value={draft.gapStatuses[gap.id] ?? gap.status}
                    onChange={(event) =>
                      setGapStatus(gap.id, event.target.value as DiffGapView['status'])
                    }
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="보정 메모 (선택)"
                    value={draft.gapNotes[gap.id] ?? ''}
                    onChange={(event) => setGapNote(gap.id, event.target.value)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-primary/30 bg-primary-subtle rounded-xl border p-4">
        <h3 className="font-semibold">사용자 보정</h3>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4 text-sm">
          {correctionLabels.length > 0 ? (
            correctionLabels.map((item) => <li key={item}>{item}</li>)
          ) : (
            <li>상태나 메모를 변경하면 여기에 표시됩니다.</li>
          )}
        </ul>
      </div>

      <Button disabled={busy} onClick={onConfirm}>
        이 내용으로 계속
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
