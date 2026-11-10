import { ArrowLeft } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface FullScreenViewProps {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/** Full-screen "depth" layer used when entering a block from the dashboard. */
export function FullScreenView({ title, subtitle, icon, onClose, children }: FullScreenViewProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => backRef.current?.focus(), 30);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // A task sheet or confirm dialog may be layered on top of this view.
      if (document.querySelectorAll('[role="dialog"][aria-modal="true"]').length > 1) return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex flex-col bg-background text-ink"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <header className="safe-bottom border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 py-2.5 md:px-6">
          <Button
            ref={backRef}
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('detail.back')}
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Button>
          {icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl accent-soft">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {subtitle}
            </p>
            <h2 id={titleId} className="truncate text-lg font-semibold md:text-xl">
              {title}
            </h2>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-3 py-4 pb-20 md:px-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
