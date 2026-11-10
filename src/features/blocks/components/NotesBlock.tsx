import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../app/store';
import { notesBlockConfigSchema } from '../definitions';
import type { BlockComponentProps } from './TasksBlock';

type SaveStatus = 'idle' | 'saving' | 'saved';

export function NotesBlock({ block }: BlockComponentProps) {
  const { t } = useTranslation();
  const saveBlockConfig = useAppStore((state) => state.saveBlockConfig);
  const parsed = notesBlockConfigSchema.safeParse(block.config);
  const config = parsed.success ? parsed.data : { version: 2 as const, text: '' };

  const [text, setText] = useState(config.text);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!dirtyRef.current) {
      setText(config.text);
      if (config.text === '') setStatus('idle');
    }
    // Only react to external config changes, never to this component's saves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id, config.text]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    setStatus('saving');
    const timer = window.setTimeout(() => {
      void saveBlockConfig(block.id, { version: 2, text }).then((ok) => {
        dirtyRef.current = false;
        setStatus(ok ? 'saved' : 'idle');
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [text, block.id, saveBlockConfig]);

  return (
    <div className="flex h-full flex-col">
      <textarea
        value={text}
        onChange={(event) => {
          dirtyRef.current = true;
          setText(event.target.value);
        }}
        onBlur={() => {
          if (!dirtyRef.current) return;
          dirtyRef.current = false;
          setStatus('saving');
          void saveBlockConfig(block.id, { version: 2, text }).then((ok) => {
            setStatus(ok ? 'saved' : 'idle');
          });
        }}
        placeholder={t('blocks.notesPlaceholder')}
        aria-label={t('blocks.notes.name')}
        className="min-h-[120px] w-full flex-1 resize-y rounded-xl border border-line bg-surface2 p-3 text-sm leading-relaxed text-ink placeholder:text-muted focus:border-[color:var(--space-accent)]"
      />
      <p className="mt-1 min-h-[16px] px-1 text-right text-[11px] text-muted" aria-live="polite">
        {status === 'saving'
          ? t('blocks.notesSaving')
          : status === 'saved'
            ? t('blocks.notesSaved')
            : ''}
      </p>
    </div>
  );
}
