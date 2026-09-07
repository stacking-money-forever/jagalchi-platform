import { AppShell } from '@/components/app-shell/app-shell';
import type { AppTab } from '@/components/app-shell/mobile-bottom-nav';

import { MyRoadmapsSidebar } from '../../organisms/MyRoadmapsSidebar';

interface MyRoadmapsLayoutProps {
  activeTab?: AppTab;
  children: React.ReactNode;
  onLogout?: () => void;
  onProfileClick?: () => void;
  userEmail?: string | null;
  userName?: string | null;
}

export function MyRoadmapsLayout({
  activeTab = 'library',
  children,
  onLogout,
  onProfileClick,
  userEmail,
  userName,
}: MyRoadmapsLayoutProps) {
  return (
    <AppShell activeTab={activeTab}>
      <div className="border-border bg-card flex min-h-[calc(100dvh-10rem)] overflow-hidden rounded-2xl border">
        <MyRoadmapsSidebar
          className="hidden min-h-0 lg:flex"
          onLogout={onLogout}
          onProfileClick={onProfileClick}
          userEmail={userEmail ?? undefined}
          userName={userName ?? undefined}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AppShell>
  );
}
