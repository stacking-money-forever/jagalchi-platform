import type { ReactNode } from 'react';

import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export type CurrentLessonCardProps = {
  roadmap: string;
  title: ReactNode;
  meta: string;
  href: string;
  actionLabel?: string;
  headingId?: string;
};

export function CurrentLessonCard({
  roadmap,
  title,
  meta,
  href,
  actionLabel = '과제 이어가기',
  headingId,
}: CurrentLessonCardProps) {
  return (
    <Card asChild intent="primary" variant="solid" padding="none" radius="xl">
      <article className="flex h-full flex-col gap-[18px] rounded-3xl p-7">
        <p className="text-primary-foreground/70 text-[13px] font-semibold">{roadmap}</p>
        <h1
          id={headingId}
          className="max-w-2xl text-2xl leading-[1.25] font-extrabold tracking-tight sm:text-3xl"
        >
          {title}
        </h1>
        <p className="text-primary-foreground/70 max-w-2xl text-[13px] leading-6">{meta}</p>

        <Button asChild intent="inverse" size="lg" className="w-fit">
          <Link href={href}>
            {actionLabel}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </article>
    </Card>
  );
}
