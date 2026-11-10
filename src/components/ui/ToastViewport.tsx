import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '../../app/toast';
import { cn } from '../../lib/cn';

export function ToastViewport() {
  const { t } = useTranslation();
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-3"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-card',
            toast.tone === 'error'
              ? 'border-[color:var(--danger)] bg-[var(--danger-soft)] text-danger'
              : 'border-line bg-surface text-ink',
          )}
        >
          {toast.tone === 'error' ? (
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          )}
          <p className="min-w-0 flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label={t('common.dismiss')}
            className="touch-target -m-2 flex items-center justify-center rounded-lg p-2 opacity-70 hover:opacity-100"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
