import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import type { Block } from '../../db/types';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';
import { getRegisteredBlock } from './registry';

const WIDTH_OPTIONS = [3, 4, 6, 8, 12];

interface BlockFrameProps {
  block: Block;
  editMode: boolean;
}

export function BlockFrame({ block, editMode }: BlockFrameProps) {
  const { t } = useTranslation();
  const blocks = useAppStore((state) => state.blocks);
  const updateBlock = useAppStore((state) => state.updateBlock);
  const moveBlock = useAppStore((state) => state.moveBlock);
  const removeBlock = useAppStore((state) => state.removeBlock);

  const definition = getRegisteredBlock(block.type);
  const Icon = definition?.Icon;
  const Component = definition?.Component;
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((entry) => entry.id === block.id);
  const isFirst = index <= 0;
  const isLast = index === sorted.length - 1;

  return (
    <div
      className={cn(
        'card flex h-full flex-col overflow-hidden',
        !block.visible && 'border-dashed opacity-70',
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5 md:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {Icon ? (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg accent-soft">
              <Icon size={15} className="text-[color:var(--space-accent)]" aria-hidden="true" />
            </span>
          ) : null}
          <h2 className="truncate text-sm font-semibold text-ink">
            {definition ? t(definition.titleKey) : t('blocks.unknown')}
          </h2>
          {!block.visible ? (
            <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t('blocks.hidden')}
            </span>
          ) : null}
        </div>

        {editMode ? (
          <div className="flex flex-wrap items-center gap-0.5">
            <select
              value={block.position.width}
              aria-label={t('blocks.width')}
              onChange={(event) =>
                void updateBlock(block.id, {
                  position: { ...block.position, width: Number(event.target.value) },
                })
              }
              className="min-h-[44px] rounded-lg border border-line bg-surface2 px-1.5 text-xs text-ink"
            >
              {WIDTH_OPTIONS.map((width) => (
                <option key={width} value={width}>
                  {t('blocks.columns', { count: width })}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('blocks.moveUp')}
              disabled={isFirst}
              onClick={() => void moveBlock(block.id, 'up')}
            >
              <ArrowUp size={16} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('blocks.moveDown')}
              disabled={isLast}
              onClick={() => void moveBlock(block.id, 'down')}
            >
              <ArrowDown size={16} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={block.visible ? t('blocks.hide') : t('blocks.show')}
              onClick={() => void updateBlock(block.id, { visible: !block.visible })}
            >
              {block.visible ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('blocks.remove')}
              onClick={() => void removeBlock(block.id)}
              className="text-danger hover:bg-[var(--danger-soft)]"
            >
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 p-3 md:p-4">
        {Component ? (
          <Component block={block} editMode={editMode} />
        ) : (
          <p className="text-sm text-muted">{t('blocks.unknown')}</p>
        )}
      </div>
    </div>
  );
}

export function blockWrapperStyle(block: Block): CSSProperties {
  return { '--block-width': String(block.position.width) } as CSSProperties;
}
