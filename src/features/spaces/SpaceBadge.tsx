import type { Space } from '../../db/types';
import { cn } from '../../lib/cn';

interface SpaceBadgeProps {
  space: Space;
  showName?: boolean;
  className?: string;
}

export function SpaceBadge({ space, showName = true, className }: SpaceBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-[9rem] items-center gap-1 rounded-full bg-surface2 px-1.5 py-0.5 text-[10px] font-medium text-muted',
        className,
      )}
      title={space.name}
      aria-label={space.name}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: space.color }}
        aria-hidden="true"
      />
      {showName ? <span className="truncate">{space.name}</span> : null}
    </span>
  );
}
