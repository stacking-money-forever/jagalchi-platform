import Link from 'next/link';

import { BookOpen, CirclePlus, House, UserRound, type LucideIcon } from 'lucide-react';

import { isEnabled } from '@/lib/feature-flags';

export type AppTab =
  'home' | 'career' | 'roadmaps' | 'library' | 'explore' | 'create' | 'activity' | 'my';

export interface MobileBottomNavProps {
  activeTab: AppTab;
}

const navItems: ReadonlyArray<{
  id: AppTab;
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  { id: 'home', label: '내 프로젝트', href: '/myroadmap', icon: House },
  { id: 'library', label: '라이브러리', href: '/library', icon: BookOpen },
  ...(isEnabled('EVIDENCE_EXECUTION_ENABLED') && isEnabled('PROJECT_RUNS_ENABLED')
    ? [{ id: 'create' as const, label: '만들기', href: '/projects/new', icon: CirclePlus }]
    : []),
  { id: 'my', label: '계정', href: '/profile', icon: UserRound },
];

export function MobileBottomNav({ activeTab }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="주요 메뉴"
      className="border-border bg-surface fixed inset-x-0 bottom-0 z-50 border-t px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="mx-auto flex max-w-md gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <li className="min-w-0 flex-1" key={item.id}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={[
                  'min-h-touch flex w-full flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[10px] font-semibold transition-[background-color,color]',
                  'focus-visible:ring-ring focus-visible:ring-offset-surface focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                ].join(' ')}
                href={item.href}
              >
                <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
