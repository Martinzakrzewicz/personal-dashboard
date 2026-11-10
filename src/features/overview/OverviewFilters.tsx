import { Layers as SpaceIcon } from 'lucide-react';
import type { Space } from '../../db/types';
import { getSpaceIcon } from '../spaces/icons';
import { cn } from '../../lib/cn';
import { useTranslation } from 'react-i18next';

interface OverviewFiltersProps {
  spaces: Space[];
  selectedSpaceId: string;
  onChange: (spaceId: string) => void;
  counts?: Record<string, number>;
}

export function OverviewFilters({
  spaces,
  selectedSpaceId,
  onChange,
  counts,
}: OverviewFiltersProps) {
  const { t } = useTranslation();
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <button
        type="button"
        onClick={() => onChange('all')}
        aria-pressed={selectedSpaceId === 'all'}
        className={cn(
          'flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition',
          selectedSpaceId === 'all'
            ? 'border-[color:var(--space-accent)] bg-[color:var(--space-accent)] text-[color:var(--space-accent-contrast)]'
            : 'border-line bg-surface text-muted hover:bg-surface2 hover:text-ink',
        )}
      >
        <SpaceIcon size={15} aria-hidden="true" />
        {t('blocks.allSpaces')}
        {counts ? (
          <span
            className={cn(
              'rounded-full px-1.5 text-[10px]',
              selectedSpaceId === 'all' ? 'bg-black/15' : 'bg-surface2',
            )}
          >
            {counts.all ?? 0}
          </span>
        ) : null}
      </button>
      {spaces.map((space) => {
        const Icon = getSpaceIcon(space.icon);
        const active = selectedSpaceId === space.id;
        return (
          <button
            key={space.id}
            type="button"
            onClick={() => onChange(space.id)}
            aria-pressed={active}
            className={cn(
              'flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition',
              active
                ? 'border-transparent text-ink'
                : 'border-line bg-surface text-muted hover:bg-surface2 hover:text-ink',
            )}
            style={
              active
                ? {
                    backgroundColor: `color-mix(in srgb, ${space.color} 18%, var(--surface))`,
                    boxShadow: `inset 0 0 0 1px ${space.color}`,
                  }
                : undefined
            }
          >
            <Icon size={15} style={{ color: space.color }} aria-hidden="true" />
            <span className="max-w-[9rem] truncate">{space.name}</span>
            {counts ? (
              <span className="rounded-full bg-surface2 px-1.5 text-[10px]">
                {counts[space.id] ?? 0}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
