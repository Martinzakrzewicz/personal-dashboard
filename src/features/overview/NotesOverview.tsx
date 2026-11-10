import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Block, Space } from '../../db/types';
import { updateBlock as updateBlockRecord } from '../../db/blocks.repo';
import { notesBlockConfigSchema } from '../blocks/definitions';
import { notifyLocalChange } from '../sync/events';
import { getSpaceIcon } from '../spaces/icons';
import { cn } from '../../lib/cn';
import { OverviewFilters } from './OverviewFilters';
import { useOverview } from './useOverview';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface NoteCardProps {
  space: Space;
  block: Block;
  index: number;
}

function NoteCard({ space, block, index }: NoteCardProps) {
  const { t, i18n } = useTranslation();
  const parsed = notesBlockConfigSchema.safeParse(block.config);
  const config = parsed.success ? parsed.data : { version: 2 as const, text: '' };

  const [text, setText] = useState(config.text);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!dirtyRef.current) setText(config.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id, config.text]);

  const persist = useCallback(
    async (value: string) => {
      setStatus('saving');
      try {
        await updateBlockRecord(space.id, block.id, { config: { version: 2, text: value } });
        dirtyRef.current = false;
        setStatus('saved');
        notifyLocalChange();
      } catch {
        setStatus('error');
      }
    },
    [block.id, space.id],
  );

  useEffect(() => {
    if (!dirtyRef.current) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void persist(text), 500);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [text, persist]);

  return (
    <article className="card p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[11px] text-muted">
            {t('detail.noteNumber', { count: index + 1 })}
          </span>
          {!block.visible ? (
            <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t('blocks.hidden')}
            </span>
          ) : null}
        </div>
        <span className="text-[10px] text-muted">
          {new Intl.DateTimeFormat(i18n.language, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(block.updatedAt))}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(event) => {
          dirtyRef.current = true;
          setText(event.target.value);
        }}
        onBlur={() => {
          if (!dirtyRef.current) return;
          if (timerRef.current !== null) window.clearTimeout(timerRef.current);
          void persist(text);
        }}
        placeholder={t('blocks.notesPlaceholder')}
        aria-label={`${space.name} — ${t('detail.noteNumber', { count: index + 1 })}`}
        className="min-h-[110px] w-full resize-y rounded-xl border border-line bg-surface2 p-3 text-sm leading-relaxed text-ink placeholder:text-muted focus:border-[color:var(--space-accent)]"
      />
      <p
        className={cn(
          'mt-1 min-h-[16px] text-right text-[11px]',
          status === 'error' ? 'text-danger' : 'text-muted',
        )}
        aria-live="polite"
      >
        {status === 'saving'
          ? t('blocks.notesSaving')
          : status === 'saved'
            ? t('blocks.notesSaved')
            : status === 'error'
              ? t('errors.saveBlock')
              : ''}
      </p>
    </article>
  );
}

export function NotesOverview() {
  const { t } = useTranslation();
  const { snapshot, loading } = useOverview();
  const [selectedSpaceId, setSelectedSpaceId] = useState('all');

  if (loading || !snapshot) {
    return <p className="py-10 text-center text-sm text-muted">{t('detail.loading')}</p>;
  }

  const spaces = snapshot.spaces.map((entry) => entry.space);
  const notes = snapshot.spaces.flatMap((entry) =>
    entry.blocks
      .filter((block) => block.type === 'notes')
      .filter((block) => {
        const parsed = notesBlockConfigSchema.safeParse(block.config);
        return parsed.success && parsed.data.text.trim().length > 0;
      })
      .map((block) => ({ space: entry.space, block })),
  );
  const counts: Record<string, number> = { all: notes.length };
  for (const entry of snapshot.spaces) {
    counts[entry.space.id] = notes.filter((note) => note.space.id === entry.space.id).length;
  }

  const filtered =
    selectedSpaceId === 'all'
      ? notes
      : notes.filter((note) => note.space.id === selectedSpaceId);

  return (
    <div className="space-y-4">
      <OverviewFilters
        spaces={spaces}
        selectedSpaceId={selectedSpaceId}
        onChange={setSelectedSpaceId}
        counts={counts}
      />

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          {t('detail.emptyNotes')}
        </p>
      ) : (
        snapshot.spaces
          .filter((entry) => selectedSpaceId === 'all' || entry.space.id === selectedSpaceId)
          .map((entry) => {
            const spaceNotes = entry.blocks
              .filter((block) => block.type === 'notes')
              .filter((block) => {
                const parsed = notesBlockConfigSchema.safeParse(block.config);
                return parsed.success && parsed.data.text.trim().length > 0;
              });
            if (spaceNotes.length === 0) return null;
            const Icon = getSpaceIcon(entry.space.icon);
            return (
              <section key={entry.space.id} className="space-y-2">
                <h3 className="flex items-center gap-2 px-1 text-sm font-semibold text-ink">
                  <Icon size={16} style={{ color: entry.space.color }} aria-hidden="true" />
                  {entry.space.name}
                  <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px] text-muted">
                    {spaceNotes.length}
                  </span>
                </h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {spaceNotes.map((block, index) => (
                    <NoteCard key={block.id} space={entry.space} block={block} index={index} />
                  ))}
                </div>
              </section>
            );
          })
      )}
    </div>
  );
}
