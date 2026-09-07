import { Suspense } from 'react';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft, Ticket } from 'lucide-react';

import { AppShell } from '@/components/app-shell/app-shell';
import { TICKET_PACKS, formatTicketCount } from '@/features/tickets';
import { TicketCheckout } from '@/features/tickets/components/ticket-checkout';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '티켓 결제',
  description: '선택한 AI 티켓 팩과 결제 조건을 확인하세요.',
};

async function TicketCheckoutContent({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string | string[] }>;
}) {
  const rawPack = (await searchParams).pack;
  const packId = Array.isArray(rawPack) ? rawPack[0] : rawPack;
  const pack = TICKET_PACKS.find((candidate) => candidate.id === packId);
  if (!pack) notFound();

  return (
    <AppShell activeTab="my">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href="/tickets"
          className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors outline-none focus-visible:ring-2"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          티켓 스토어로 돌아가기
        </Link>

        <header className="mt-6">
          <p className="text-primary text-sm font-bold">결제 전 확인</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {formatTicketCount(pack.tickets)} 티켓 팩
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            결제 승인이 완료된 뒤에만 티켓 잔액이 늘어나요.
          </p>
        </header>

        <section
          aria-labelledby="order-heading"
          className="border-border bg-card mt-7 rounded-3xl border p-6 shadow-sm sm:p-8"
        >
          <div className="flex items-start justify-between gap-5">
            <div>
              <p id="order-heading" className="text-muted-foreground text-sm font-bold">
                주문 상품
              </p>
              <p className="mt-2 text-3xl font-black">{formatTicketCount(pack.tickets)}</p>
            </div>
            <span className="bg-ticket-subtle text-ticket flex size-12 items-center justify-center rounded-2xl">
              <Ticket aria-hidden="true" className="size-6" />
            </span>
          </div>
          <TicketCheckout pack={pack} />
        </section>
      </div>
    </AppShell>
  );
}

export default function TicketCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p className="p-8 text-center">결제 정보를 준비하고 있어요…</p>}>
      <TicketCheckoutContent searchParams={searchParams} />
    </Suspense>
  );
}
