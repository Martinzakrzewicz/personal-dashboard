import { ChevronDown, ChevronRight } from 'lucide-react';

interface TaskZoneHeadingProps {
  title: string;
  count: number;
  expanded?: boolean;
  onToggle?: () => void;
  controls?: string;
}

export function TaskZoneHeading({
  title,
  count,
  expanded,
  onToggle,
  controls,
}: TaskZoneHeadingProps) {
  const content = (
    <>
      <span className="flex items-center gap-1.5">
        {onToggle ? (
          expanded ? (
            <ChevronDown size={16} aria-hidden="true" />
          ) : (
            <ChevronRight size={16} aria-hidden="true" />
          )
        ) : null}
        {title}
      </span>
      <span className="rounded-full bg-surface2 px-2 py-0.5 text-[11px] font-semibold text-muted">
        {count}
      </span>
    </>
  );

  if (onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={controls}
        className="touch-target flex w-full items-center justify-between gap-2 rounded-lg px-1 text-left text-sm font-semibold text-ink hover:bg-surface2"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-1 text-sm font-semibold text-ink">
      {content}
    </div>
  );
}
