import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import { detectTrailingImportance } from './parser';
import type { Importance } from '../../db/types';
import { cn } from '../../lib/cn';

const IMPORTANCE_COLOR: Record<Importance, string> = {
  critical: 'var(--importance-critical)',
  high: 'var(--importance-high)',
  medium: 'var(--importance-medium)',
  low: 'var(--importance-low)',
};

export function CaptureBar() {
  const { t } = useTranslation();
  const capture = useAppStore((state) => state.capture);
  const activeSpaceId = useAppStore((state) => state.activeSpaceId);
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const detected = detectTrailingImportance(value);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== 'n') return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      }
      if (document.querySelector('[role="dialog"]')) return;
      if (!activeSpaceId) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeSpaceId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim() || submitting) return;
    setSubmitting(true);
    const success = await capture(value);
    setSubmitting(false);
    if (success) {
      setValue('');
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2.5 md:sticky md:top-0 md:z-20 md:border-b md:border-t-0 md:bg-[color:var(--bg)] md:px-0 md:pb-3 md:pt-3">
      <form
        onSubmit={onSubmit}
        className="mx-auto flex w-full max-w-3xl flex-col gap-1.5"
        aria-label={t('capture.focus')}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex min-w-0 flex-1 items-center">
            <Zap
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 text-[color:var(--space-accent)]"
            />
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={t('capture.placeholder')}
              aria-label={t('capture.placeholder')}
              autoComplete="off"
              enterKeyHint="done"
              className="min-h-[46px] w-full rounded-xl border border-line bg-surface py-2 pl-10 pr-3 text-[15px] text-ink placeholder:text-muted focus:border-[color:var(--space-accent)] md:min-h-[48px] md:text-base"
            />
            {detected ? (
              <span
                className="pointer-events-none absolute right-2 hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline-block"
                style={{
                  color: IMPORTANCE_COLOR[detected],
                  backgroundColor: `color-mix(in srgb, ${IMPORTANCE_COLOR[detected]} 16%, transparent)`,
                }}
              >
                {t(`importance.${detected}`)}
              </span>
            ) : null}
          </div>
          <button
            type="submit"
            aria-label={t('capture.submit')}
            className={cn(
              'touch-target inline-flex items-center gap-1.5 rounded-xl border border-transparent bg-[color:var(--space-accent)] px-3.5 text-sm font-semibold text-[color:var(--space-accent-contrast)] transition hover:opacity-90 active:opacity-80 md:px-4',
              submitting && 'opacity-70',
            )}
          >
            <Plus size={19} aria-hidden="true" />
            <span className="hidden sm:inline">{t('capture.submit')}</span>
          </button>
        </div>
        <div className="flex min-h-[16px] flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
          <p className="text-[11px] leading-tight text-muted">
            {detected ? (
              <span style={{ color: IMPORTANCE_COLOR[detected] }} className="font-medium">
                {t('capture.detected', { importance: t(`importance.${detected}`) })}
              </span>
            ) : (
              t('capture.tokenHint')
            )}
          </p>
          <p className="hidden items-center gap-1 text-[11px] text-muted md:flex">
            <kbd className="rounded border border-line bg-surface2 px-1.5 py-0.5 font-sans text-[10px] font-semibold">
              N
            </kbd>
            {t('capture.shortcutHint')}
          </p>
        </div>
      </form>
    </div>
  );
}
