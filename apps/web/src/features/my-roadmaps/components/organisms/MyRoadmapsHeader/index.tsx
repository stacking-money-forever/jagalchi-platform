import { MY_ROADMAPS_MESSAGES } from '@/constants/messages';
import { cn } from '@/lib/utils';

interface MyRoadmapsHeaderProps {
  className?: string;
  description?: string;
  title?: string;
  userName?: string;
}

export function MyRoadmapsHeader({
  className,
  description,
  title = MY_ROADMAPS_MESSAGES.HEADER_TITLE,
  userName = 'User',
}: MyRoadmapsHeaderProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-start justify-center gap-4 px-4 pt-6 pb-3 sm:px-6 lg:px-10 lg:pt-8',
        className,
      )}
    >
      <div className="flex w-full flex-col justify-center">
        <h1 className="text-foreground text-2xl leading-none font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h1>
      </div>
      <div className="border-primary flex w-full items-center border-l-2 px-4 py-0">
        <p className="text-foreground flex-1 overflow-hidden text-sm font-medium tracking-[0.07px] text-ellipsis">
          {description ?? `${userName}님의 ${MY_ROADMAPS_MESSAGES.HEADER_ROADMAP_SUFFIX}`}
        </p>
      </div>
    </div>
  );
}
