'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useAtomValue } from 'jotai';
import { Search, UserRound } from 'lucide-react';

import { ThemeToggle } from '@/components/ui/theme-toggle';
import { isAuthenticatedAtom } from '@/lib/auth-atoms';
import { isEnabled } from '@/lib/feature-flags';

const headerLinks = [
  { label: '내 프로젝트', href: '/myroadmap' },
  { label: '라이브러리', href: '/library' },
] as const;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

export function ProductHeader() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  return (
    <header className="border-border bg-surface h-16 border-b md:h-[72px]">
      <div className="mx-auto flex h-full w-full max-w-[1440px] items-center gap-3 px-5 md:gap-7 md:px-16">
        <Link
          aria-label="Jagalchi 홈"
          className={`text-primary size-touch inline-flex shrink-0 items-center justify-center rounded-md ${focusRing}`}
          href="/"
        >
          <span className="dark:bg-primary flex size-7 items-center justify-center rounded-md">
            <Image src="/jagalchi.svg" alt="" width={20} height={20} priority />
          </span>
        </Link>

        <nav aria-label="데스크톱 주요 메뉴" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {headerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  className={`min-h-touch text-muted-foreground hover:bg-muted hover:text-foreground flex items-center rounded-md px-3 text-[13px] font-semibold transition-colors ${focusRing}`}
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {isEnabled('EVIDENCE_EXECUTION_ENABLED') && isEnabled('PROJECT_RUNS_ENABLED') ? (
          <Link
            className={`min-h-touch bg-primary text-primary-foreground hover:bg-primary/90 hidden items-center rounded-md px-3 text-[13px] font-bold transition-colors md:inline-flex ${focusRing}`}
            href="/projects/new"
          >
            프로젝트 만들기
          </Link>
        ) : null}

        <Link
          aria-label="실전 과제 검색"
          className={`min-h-touch border-border bg-surface text-muted-foreground hover:bg-muted hover:text-foreground ml-auto hidden min-w-0 flex-1 items-center gap-2 rounded-full border px-4 text-[13px] transition-colors md:flex lg:max-w-xs ${focusRing}`}
          href="/explore"
        >
          <Search aria-hidden="true" className="size-[18px] shrink-0" />
          <span className="truncate">필요한 증거 과제 검색</span>
        </Link>

        <span aria-hidden="true" className="ml-auto md:hidden" />
        <ThemeToggle />

        <Link
          aria-label={isAuthenticated ? '내 계정' : '로그인'}
          className={`size-touch bg-primary-subtle text-primary hover:bg-primary-subtle/70 flex shrink-0 items-center justify-center rounded-full transition-colors ${focusRing}`}
          href={isAuthenticated ? '/profile' : '/login'}
        >
          <UserRound aria-hidden="true" className="size-5" />
        </Link>
      </div>
    </header>
  );
}
