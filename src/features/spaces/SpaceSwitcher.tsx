import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  Palette,
  Pencil,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { cn } from '../../lib/cn';
import { CreateSpaceDialog } from './CreateSpaceDialog';
import { getSpaceIcon, SPACE_COLORS } from './icons';

interface SpaceSwitcherProps {
  variant: 'sidebar' | 'bar';
  onOpenSettings: () => void;
}

export function SpaceSwitcher({ variant, onOpenSettings }: SpaceSwitcherProps) {
  const { t } = useTranslation();
  const spaces = useAppStore((state) => state.spaces);
  const activeSpaceId = useAppStore((state) => state.activeSpaceId);
  const switchSpace = useAppStore((state) => state.switchSpace);
  const updateSpace = useAppStore((state) => state.updateSpace);
  const moveSpace = useAppStore((state) => state.moveSpace);
  const archiveSpace = useAppStore((state) => state.archiveSpace);

  const visibleSpaces = spaces
    .filter((space) => !space.archived)
    .sort((a, b) => a.order - b.order);
  const activeSpace = visibleSpaces.find((space) => space.id === activeSpaceId) ?? null;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [colorOpen, setColorOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const startRename = () => {
    if (!activeSpace) return;
    setEditingId(activeSpace.id);
    setNameDraft(activeSpace.name);
    setColorOpen(false);
  };

  const submitRename = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingId || !nameDraft.trim()) return;
    const ok = await updateSpace(editingId, { name: nameDraft.trim() });
    if (ok) setEditingId(null);
  };

  const isSidebar = variant === 'sidebar';

  const list = (
    <nav
      className={cn(
        isSidebar ? 'flex flex-col gap-1' : 'flex gap-2 overflow-x-auto no-scrollbar',
      )}
      aria-label={t('a11y.spaceList')}
    >
      {visibleSpaces.map((space) => {
        const Icon = getSpaceIcon(space.icon);
        const active = space.id === activeSpaceId;
        const editing = space.id === editingId;

        if (editing) {
          return (
            <form
              key={space.id}
              onSubmit={submitRename}
              className={cn(
                'flex items-center gap-1 rounded-xl border border-[color:var(--space-accent)] bg-surface p-1',
                isSidebar ? 'w-full' : 'min-w-[210px]',
              )}
            >
              <input
                value={nameDraft}
                maxLength={80}
                autoFocus
                aria-label={t('spaces.name')}
                onChange={(event) => setNameDraft(event.target.value)}
                className="min-h-[44px] min-w-0 flex-1 rounded-lg bg-surface2 px-2 text-sm text-ink"
              />
              <button
                type="submit"
                aria-label={t('common.save')}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-[color:var(--space-accent)] hover:bg-surface2"
              >
                <Check size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t('common.cancel')}
                onClick={() => setEditingId(null)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-surface2"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </form>
          );
        }

        return (
          <button
            key={space.id}
            type="button"
            onClick={() => {
              setColorOpen(false);
              void switchSpace(space.id);
            }}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'flex min-h-[44px] items-center gap-2 rounded-xl text-left transition',
              isSidebar ? 'w-full px-2.5 py-2' : 'shrink-0 px-3 py-2',
              active
                ? 'bg-surface2 font-semibold text-ink'
                : 'text-muted hover:bg-surface2 hover:text-ink',
            )}
            style={
              active
                ? {
                    boxShadow: `inset 3px 0 0 ${space.color}`,
                    backgroundColor: `color-mix(in srgb, ${space.color} 12%, var(--surface))`,
                  }
                : undefined
            }
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${space.color} 18%, transparent)` }}
            >
              <Icon size={17} style={{ color: space.color }} aria-hidden="true" />
            </span>
            <span className="max-w-[11rem] truncate text-sm">{space.name}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        aria-label={t('spaces.add')}
        className={cn(
          'flex min-h-[44px] items-center gap-2 rounded-xl border border-dashed border-line text-sm text-muted hover:bg-surface2 hover:text-ink',
          isSidebar ? 'w-full px-2.5 py-2' : 'shrink-0 px-3 py-2',
        )}
      >
        <Plus size={17} aria-hidden="true" />
        <span className={cn(isSidebar ? 'inline' : 'hidden sm:inline')}>{t('spaces.add')}</span>
      </button>
    </nav>
  );

  const controls = activeSpace ? (
    <div className={cn('flex flex-wrap items-center gap-0.5', isSidebar ? 'mt-2' : 'mt-1')}>
      <Button variant="ghost" size="icon" aria-label={t('spaces.renameHint')} onClick={startRename}>
        <Pencil size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('spaces.color')}
        aria-pressed={colorOpen}
        onClick={() => setColorOpen((value) => !value)}
      >
        <Palette size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('spaces.moveUp')}
        onClick={() => void moveSpace(activeSpace.id, 'up')}
      >
        <ArrowUp size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('spaces.moveDown')}
        onClick={() => void moveSpace(activeSpace.id, 'down')}
      >
        <ArrowDown size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('spaces.archive')}
        onClick={() => setArchiveTarget(activeSpace.id)}
        className="text-danger hover:bg-[var(--danger-soft)]"
      >
        <Archive size={16} aria-hidden="true" />
      </Button>
      {colorOpen ? (
        <div className="flex w-full flex-wrap gap-1.5 px-1 py-1">
          {SPACE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              aria-pressed={activeSpace.color === color}
              onClick={() => {
                void updateSpace(activeSpace.id, { color });
                setColorOpen(false);
              }}
              className={cn(
                'h-11 w-11 rounded-full border-2',
                activeSpace.color === color ? 'border-ink' : 'border-transparent',
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      {isSidebar ? (
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
          <div className="flex items-center gap-2 px-5 pb-3 pt-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--space-accent)] text-sm font-bold text-[color:var(--space-accent-contrast)]">
              {t('app.logo')}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{t('app.name')}</p>
              <p className="truncate text-[11px] text-muted">{t('app.subtitle')}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2">
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t('spaces.title')}
            </p>
            {list}
            {controls}
          </div>
          <div className="border-t border-line p-3">
            <Button variant="ghost" className="w-full justify-start" onClick={onOpenSettings}>
              <Settings size={18} aria-hidden="true" />
              {t('nav.settings')}
            </Button>
          </div>
        </aside>
      ) : (
        <div className="sticky top-0 z-30 border-b border-line bg-surface px-3 pb-2 pt-2 md:hidden">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-ink">{t('app.name')}</p>
            <Button variant="ghost" size="icon" aria-label={t('a11y.openSettings')} onClick={onOpenSettings}>
              <Settings size={19} aria-hidden="true" />
            </Button>
          </div>
          {list}
          {controls}
        </div>
      )}

      <CreateSpaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ConfirmDialog
        open={archiveTarget !== null}
        title={t('spaces.archiveTitle')}
        body={t('spaces.archiveBody')}
        confirmLabel={t('spaces.archive')}
        onConfirm={() => {
          if (archiveTarget) void archiveSpace(archiveTarget);
          setArchiveTarget(null);
        }}
        onCancel={() => setArchiveTarget(null)}
      />
    </>
  );
}
