import Link from 'next/link';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock3,
  Info,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Ticket,
} from 'lucide-react';

import { AppShell } from '@/components/app-shell/app-shell';
import {
  MONTHLY_TICKET_GRANT,
  TICKET_COSTS,
  TICKET_PACKS,
  TICKETS_NEVER_EXPIRE,
  formatTicketCount,
} from '@/features/tickets';
import {
  LiveTicketBalance,
  TicketWalletHero,
} from '@/features/tickets/components/ticket-wallet-live';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 티켓',
  description: 'AI 기능에 사용할 티켓 잔액과 이용 내역을 확인하세요.',
};

const ticketUses = [
  {
    tickets: TICKET_COSTS.coaching,
    title: 'AI 코칭 · 노드 설명 · 자료 추천',
    description: '짧은 질문과 학습 도움',
  },
  {
    tickets: TICKET_COSTS.deep_search,
    title: '심층 검색 · 피드백',
    description: '더 깊은 탐색과 결과 검토',
  },
  {
    tickets: TICKET_COSTS.roadmap_generation,
    title: '로드맵 생성 · 문서 변환',
    description: '새 학습 경로와 문서 기반 생성',
  },
] as const;

const ledgerPreview = [
  {
    id: 'monthly-grant-example',
    label: '월간 무료 티켓',
    date: '2026. 8. 1.',
    amount: MONTHLY_TICKET_GRANT,
    status: '지급 예시',
    kind: 'grant',
  },
  {
    id: 'roadmap-generation-example',
    label: 'AI 로드맵 생성',
    date: '2026. 8. 18.',
    amount: -TICKET_COSTS.roadmap_generation,
    status: '사용 예시',
    kind: 'usage',
  },
  {
    id: 'failed-refund-example',
    label: '실패한 심층 검색 환급',
    date: '2026. 8. 20.',
    amount: TICKET_COSTS.deep_search,
    status: '환급 예시',
    kind: 'refund',
  },
] as const;

const priceFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

function formatLedgerAmount(amount: number): string {
  const sign = amount > 0 ? '+' : '−';
  return `${sign}${formatTicketCount(Math.abs(amount))}`;
}

export default function TicketsPage() {
  return (
    <AppShell activeTab="my">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-primary flex items-center gap-2 text-sm font-bold">
              <Sparkles aria-hidden="true" className="size-4" />
              AI 티켓 지갑
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              필요한 만큼, 학습에 집중하세요
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6 sm:text-base">
              AI 기능별 사용량을 확인하고 티켓을 충전할 수 있어요.
            </p>
          </div>
          <LiveTicketBalance />
        </header>

        <TicketWalletHero />

        <section aria-labelledby="usage-heading" className="mt-10">
          <div>
            <p className="text-primary text-xs font-bold">간단한 사용 기준</p>
            <h2 id="usage-heading" className="mt-1 text-xl font-extrabold sm:text-2xl">
              AI 기능별 티켓 비용
            </h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {ticketUses.map((item) => (
              <article key={item.tickets} className="border-border bg-card rounded-2xl border p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                    <Sparkles aria-hidden="true" className="size-5" />
                  </span>
                  <strong className="bg-muted rounded-full px-3 py-1 text-sm font-extrabold">
                    {formatTicketCount(item.tickets)}
                  </strong>
                </div>
                <h3 className="mt-5 text-sm leading-6 font-extrabold">{item.title}</h3>
                <p className="text-muted-foreground mt-1 text-xs leading-5">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="store-heading" className="mt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-primary text-xs font-bold">티켓 스토어</p>
              <h2 id="store-heading" className="mt-1 text-xl font-extrabold sm:text-2xl">
                티켓 팩 선택
              </h2>
            </div>
            <p id="checkout-help" className="text-muted-foreground text-xs">
              팩을 선택하면 다음 단계에서 결제 화면이 열려요.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {TICKET_PACKS.map((pack, index) => {
              const featured = index === 1;
              return (
                <article
                  key={pack.id}
                  aria-labelledby={`${pack.id}-heading`}
                  className={`bg-card relative flex flex-col rounded-2xl border p-5 ${
                    featured ? 'border-primary ring-primary ring-1' : 'border-border'
                  }`}
                >
                  {featured ? (
                    <span className="bg-primary text-primary-foreground absolute top-0 right-5 -translate-y-1/2 rounded-full px-3 py-1 text-[11px] font-extrabold">
                      가장 인기
                    </span>
                  ) : null}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 id={`${pack.id}-heading`} className="text-2xl font-black">
                        {formatTicketCount(pack.tickets)}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-xs">AI 티켓 팩</p>
                    </div>
                    <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                      <Ticket aria-hidden="true" className="size-5" />
                    </span>
                  </div>
                  <p className="mt-6 text-lg font-extrabold">
                    {priceFormatter.format(pack.priceKrw)}
                  </p>
                  <Link
                    href={`/tickets/checkout?pack=${pack.id}`}
                    aria-describedby="checkout-help"
                    className={`focus-visible:ring-ring mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-extrabold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      featured
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    선택하고 결제 화면 열기
                  </Link>
                </article>
              );
            })}
          </div>
          <p className="text-muted-foreground mt-3 flex items-start gap-2 text-xs leading-5">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />이 화면에서는 팩만
            선택하며, 결제가 완료되기 전에는 잔액이 바뀌지 않아요.
          </p>
        </section>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section
            aria-labelledby="ledger-heading"
            className="border-border bg-card overflow-hidden rounded-2xl border"
          >
            <div className="border-border flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
              <div>
                <h2 id="ledger-heading" className="text-lg font-extrabold">
                  이용 내역 미리보기
                </h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  아래 항목은 화면 구성을 위한 예시예요.
                </p>
              </div>
              <Clock3 aria-hidden="true" className="text-muted-foreground size-5" />
            </div>
            <ul aria-label="티켓 이용 내역 예시" className="divide-border divide-y">
              {ledgerPreview.map((entry) => {
                const positive = entry.amount > 0;
                const EntryIcon =
                  entry.kind === 'refund' ? RotateCcw : positive ? ArrowDownLeft : ArrowUpRight;
                return (
                  <li key={entry.id} className="flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6">
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                        positive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <EntryIcon aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{entry.label}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {entry.date} · {entry.status}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-extrabold ${
                        positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                      }`}
                    >
                      {formatLedgerAmount(entry.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <aside
            aria-labelledby="policy-heading"
            className="border-border bg-muted/40 rounded-2xl border p-5 sm:p-6"
          >
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <h2 id="policy-heading" className="mt-5 text-lg font-extrabold">
              안심하고 사용하세요
            </h2>
            <ul className="text-muted-foreground mt-4 space-y-4 text-sm leading-6">
              <li className="flex gap-2">
                <Check aria-hidden="true" className="text-primary mt-1 size-4 shrink-0" />
                {TICKETS_NEVER_EXPIRE
                  ? '모든 티켓은 유효기간 없이 보관돼요.'
                  : '티켓별 유효기간이 적용돼요.'}
              </li>
              <li className="flex gap-2">
                <Check aria-hidden="true" className="text-primary mt-1 size-4 shrink-0" />
                AI 작업이 실패하면 사용한 티켓을 자동으로 돌려드려요.
              </li>
              <li className="flex gap-2">
                <Check aria-hidden="true" className="text-primary mt-1 size-4 shrink-0" />
                결제 확인 전에는 티켓 잔액이 변경되지 않아요.
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
