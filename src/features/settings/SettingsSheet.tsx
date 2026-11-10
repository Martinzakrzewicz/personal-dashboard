import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import { useToastStore } from '../../app/toast';
import { exportBackupJson, parseBackupJson, type BackupFile } from '../../db/backup';
import type { SupportedLanguage } from '../../i18n';
import type { ThemePreference } from '../../db/types';
import { todayISO } from '../../lib/dates';
import { cn } from '../../lib/cn';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Dialog } from '../../components/ui/Dialog';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const { t } = useTranslation();
  const pushToast = useToastStore((state) => state.push);
  const spaces = useAppStore((state) => state.spaces);
  const language = useAppStore((state) => state.language);
  const theme = useAppStore((state) => state.theme);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setTheme = useAppStore((state) => state.setTheme);
  const restoreSpace = useAppStore((state) => state.restoreSpace);
  const replaceWithBackup = useAppStore((state) => state.replaceWithBackup);

  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [exporting, setExporting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const archived = spaces
    .filter((space) => space.archived)
    .sort((a, b) => a.order - b.order);

  const onExport = async () => {
    setExporting(true);
    try {
      const json = await exportBackupJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `personal-dashboard-backup-${todayISO()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      pushToast(t('settings.exported'), 'success');
    } catch {
      pushToast(t('errors.generic'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const onFileSelected = async (file: File | undefined) => {
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      pushToast(t('settings.importReadError'), 'error');
      return;
    }
    try {
      const parsed = parseBackupJson(text);
      setPendingBackup(parsed);
    } catch {
      pushToast(t('settings.importInvalid'), 'error');
    }
  };

  const onConfirmImport = async () => {
    if (!pendingBackup) return;
    const backup = pendingBackup;
    setPendingBackup(null);
    const ok = await replaceWithBackup(backup);
    if (ok) onClose();
  };

  const languageOptions: Array<{ value: SupportedLanguage; label: string }> = [
    { value: 'en', label: t('settings.english') },
    { value: 'es', label: t('settings.spanish') },
  ];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={t('settings.title')}
        wide
        footer={
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        }
      >
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('settings.language')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {languageOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void setLanguage(option.value)}
                  aria-pressed={language === option.value}
                  className={cn(
                    'min-h-[44px] rounded-xl border px-4 text-sm font-medium transition',
                    language === option.value
                      ? 'border-[color:var(--space-accent)] bg-[color:var(--space-accent)] text-[color:var(--space-accent-contrast)]'
                      : 'border-line bg-surface text-ink hover:bg-surface2',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('settings.theme')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => void setTheme(option)}
                  aria-pressed={theme === option}
                  className={cn(
                    'min-h-[44px] rounded-xl border px-4 text-sm font-medium transition',
                    theme === option
                      ? 'border-[color:var(--space-accent)] bg-[color:var(--space-accent)] text-[color:var(--space-accent-contrast)]'
                      : 'border-line bg-surface text-ink hover:bg-surface2',
                  )}
                >
                  {t(`settings.${option}`)}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('settings.data')}
            </h3>
            <p className="text-xs text-muted">{t('settings.exportHint')}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void onExport()} disabled={exporting}>
                <Download size={16} aria-hidden="true" />
                {t('settings.export')}
              </Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload size={16} aria-hidden="true" />
                {t('settings.import')}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  void onFileSelected(file);
                  event.target.value = '';
                }}
              />
            </div>
            <p className="text-xs text-muted">{t('settings.importHint')}</p>
            <p className="text-xs text-muted">{t('settings.storage')}</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('settings.archived')}
            </h3>
            {archived.length === 0 ? (
              <p className="text-xs text-muted">{t('settings.noArchived')}</p>
            ) : (
              <ul className="space-y-1.5">
                {archived.map((space) => (
                  <li
                    key={space.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-1.5"
                  >
                    <span className="min-w-0 truncate text-sm text-ink">{space.name}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={restoringId === space.id}
                      onClick={async () => {
                        setRestoringId(space.id);
                        await restoreSpace(space.id);
                        setRestoringId(null);
                      }}
                    >
                      <RotateCcw size={14} aria-hidden="true" />
                      {t('settings.restore')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="border-t border-line pt-3 text-[11px] text-muted">
            {t('settings.version', { version: '1.0.0' })}
          </p>
        </div>
      </Dialog>

      <ConfirmDialog
        open={pendingBackup !== null}
        title={t('settings.importConfirmTitle')}
        body={t('settings.importConfirmBody')}
        confirmLabel={t('settings.import')}
        onConfirm={() => void onConfirmImport()}
        onCancel={() => setPendingBackup(null)}
      />
    </>
  );
}
