'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { repositoryModeLabel } from '../lib/proposal-presenter';

import type { ProposalComparisonView } from '../lib/proposal-presenter';

export function ProposalComparisonGrid({
  proposals,
  selectedId,
  onSelect,
}: {
  proposals: ProposalComparisonView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {proposals.map((proposal) => {
        const selected = proposal.id === selectedId;
        return (
          <article
            key={proposal.id}
            className={cn(
              'border-border flex flex-col rounded-2xl border p-5',
              selected && 'border-primary ring-primary/30 ring-2',
            )}
          >
            <h3 className="text-lg font-bold">{proposal.title}</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-semibold">인용 요구사항</dt>
                <dd className="text-muted-foreground mt-1 space-y-1">
                  {proposal.citedRequirements.map((item) => (
                    <p key={item.id}>{item.label}</p>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">인용 갭</dt>
                <dd className="text-muted-foreground mt-1 space-y-1">
                  {proposal.citedGaps.map((item) => (
                    <p key={item.id}>{item.description}</p>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">저장소 모드</dt>
                <dd>{repositoryModeLabel(proposal.repositoryMode)}</dd>
              </div>
              <div>
                <dt className="font-semibold">기대 성과</dt>
                <dd className="text-muted-foreground">{proposal.boundedOutcome}</dd>
              </div>
              <div>
                <dt className="font-semibold">비목표</dt>
                <dd className="text-muted-foreground">
                  {proposal.nonGoals.length > 0 ? proposal.nonGoals.join(' · ') : '없음'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">증거 규칙</dt>
                <dd className="text-muted-foreground">
                  {proposal.evidenceRules.join(' · ') || '없음'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">신뢰도</dt>
                <dd>
                  {proposal.confidence !== null
                    ? `${Math.round(proposal.confidence * 100)}%`
                    : '미정'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">트레이드오프</dt>
                <dd className="text-muted-foreground space-y-1">
                  {proposal.tradeoffs.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </dd>
              </div>
            </dl>
            <Button
              className="mt-auto pt-4"
              variant={selected ? 'solid' : 'outline'}
              onClick={() => onSelect(proposal.id)}
            >
              {selected ? '선택됨' : '이 제안 선택'}
            </Button>
          </article>
        );
      })}
    </div>
  );
}
