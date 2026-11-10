import { Cloud, CloudOff, Copy, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '../../app/toast';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, TextInput } from '../../components/ui/Field';
import { cn } from '../../lib/cn';
import { useSyncStore } from './store';

const TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=gist&description=Personal%20Dashboard%20Sync';

function useErrorMessage() {
  const { t } = useTranslation();
  return (code: string | null) =>
    code ? t(`sync.errors.${code as 'token' | 'gist' | 'rate' | 'network' | 'invalid' | 'unknown'}`) : '';
}

export function SyncSettings() {
  const { t, i18n } = useTranslation();
  const pushToast = useToastStore((state) => state.push);
  const config = useSyncStore((state) => state.config);
  const status = useSyncStore((state) => state.status);
  const error = useSyncStore((state) => state.error);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const createSync = useSyncStore((state) => state.createSync);
  const joinSync = useSyncStore((state) => state.joinSync);
  const syncNow = useSyncStore((state) => state.syncNow);
  const disconnect = useSyncStore((state) => state.disconnect);
  const messageForError = useErrorMessage();

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [token, setToken] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [newSyncCode, setNewSyncCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      pushToast(t('sync.copied'), 'success');
    } catch {
      pushToast(t('sync.copyFailed'), 'error');
    }
  };

  const onCreate = async () => {
    setBusy(true);
    setLocalError(null);
    try {
      const code = await createSync(token);
      setNewSyncCode(code);
      setToken('');
      pushToast(t('sync.created'), 'success');
    } catch (caught) {
      const code = caught instanceof Error && 'code' in caught ? String(caught.code) : 'unknown';
      setLocalError(code);
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    setBusy(true);
    setLocalError(null);
    try {
      await joinSync(token, joinCode);
      setToken('');
      setJoinCode('');
      pushToast(t('sync.joined'), 'success');
    } catch (caught) {
      const code = caught instanceof Error && 'code' in caught ? String(caught.code) : 'unknown';
      setLocalError(code);
    } finally {
      setBusy(false);
    }
  };

  const lastSyncLabel = lastSyncedAt
    ? t('sync.lastSync', {
        date: new Intl.DateTimeFormat(i18n.language, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(lastSyncedAt)),
      })
    : t('sync.never');

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('sync.title')}</h3>
        {config ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              status === 'synced'
                ? 'bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success'
                : status === 'error'
                  ? 'bg-[var(--danger-soft)] text-danger'
                  : 'bg-surface2 text-muted',
            )}
          >
            {status === 'syncing' ? (
              <RefreshCw size={11} className="animate-spin" aria-hidden="true" />
            ) : status === 'error' ? (
              <CloudOff size={11} aria-hidden="true" />
            ) : (
              <Cloud size={11} aria-hidden="true" />
            )}
            {status === 'syncing'
              ? t('sync.syncing')
              : status === 'error'
                ? t('sync.error')
                : t('sync.synced')}
          </span>
        ) : null}
      </div>

      <p className="text-xs text-muted">{t('sync.description')}</p>

      {config ? (
        <>
          <div className="rounded-xl border border-line bg-surface2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">{lastSyncLabel}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={status === 'syncing'}
                  onClick={() => void syncNow()}
                >
                  <RefreshCw
                    size={14}
                    className={status === 'syncing' ? 'animate-spin' : undefined}
                    aria-hidden="true"
                  />
                  {t('sync.syncNow')}
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDisconnect(true)}>
                  {t('sync.disconnect')}
                </Button>
              </div>
            </div>
            {error ? (
              <p role="alert" className="mt-2 text-xs font-medium text-danger">
                {messageForError(error)}
              </p>
            ) : null}
          </div>

          <Field label={t('sync.yourCode')}>
            <div className="flex gap-2">
              <TextInput
                readOnly
                value={config.syncCode}
                onFocus={(event) => event.target.select()}
                className="font-mono text-xs"
              />
              <Button
                variant="secondary"
                size="icon"
                aria-label={t('sync.copy')}
                onClick={() => void copy(config.syncCode)}
              >
                <Copy size={16} aria-hidden="true" />
              </Button>
            </div>
          </Field>
          <p className="text-[11px] text-muted">{t('sync.codeWarning')}</p>
          <p className="text-[11px] text-muted">{t('sync.connectedNote')}</p>
        </>
      ) : (
        <>
          <p className="text-xs text-muted">{t('sync.howItWorks')}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('create')}
              aria-pressed={tab === 'create'}
              className={cn(
                'min-h-[44px] rounded-xl border px-3 text-sm font-medium',
                tab === 'create'
                  ? 'border-[color:var(--space-accent)] bg-surface2 text-ink'
                  : 'border-line text-muted hover:bg-surface2',
              )}
            >
              {t('sync.createTab')}
            </button>
            <button
              type="button"
              onClick={() => setTab('join')}
              aria-pressed={tab === 'join'}
              className={cn(
                'min-h-[44px] rounded-xl border px-3 text-sm font-medium',
                tab === 'join'
                  ? 'border-[color:var(--space-accent)] bg-surface2 text-ink'
                  : 'border-line text-muted hover:bg-surface2',
              )}
            >
              {t('sync.joinTab')}
            </button>
          </div>

          <Field label={t('sync.tokenLabel')} htmlFor="sync-token">
            <TextInput
              id="sync-token"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={t('sync.tokenPlaceholder')}
            />
          </Field>
          <p className="text-[11px] text-muted">
            {t('sync.tokenHelp')}{' '}
            <a
              href={TOKEN_URL}
              target="_blank"
              rel="noreferrer"
              className="accent-text font-medium underline underline-offset-2"
            >
              {t('sync.createToken')}
            </a>
          </p>

          {tab === 'join' ? (
            <Field label={t('sync.syncCodeLabel')} htmlFor="sync-code">
              <TextInput
                id="sync-code"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder={t('sync.syncCodePlaceholder')}
                className="font-mono text-xs"
              />
            </Field>
          ) : null}

          {localError ? (
            <p role="alert" className="text-xs font-medium text-danger">
              {messageForError(localError)}
            </p>
          ) : null}

          {newSyncCode ? (
            <div className="rounded-xl border border-[color:var(--line)] accent-tint p-3">
              <p className="mb-2 text-xs font-semibold text-ink">{t('sync.yourCode')}</p>
              <div className="flex gap-2">
                <TextInput
                  readOnly
                  value={newSyncCode}
                  onFocus={(event) => event.target.select()}
                  className="font-mono text-xs"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label={t('sync.copy')}
                  onClick={() => void copy(newSyncCode)}
                >
                  <Copy size={16} aria-hidden="true" />
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-muted">{t('sync.codeWarning')}</p>
            </div>
          ) : null}

          <Button
            variant="primary"
            disabled={busy || !token.trim() || (tab === 'join' && !joinCode.trim())}
            onClick={() => void (tab === 'create' ? onCreate() : onJoin())}
          >
            {busy ? t('sync.syncing') : tab === 'create' ? t('sync.createAction') : t('sync.joinAction')}
          </Button>
        </>
      )}

      <ConfirmDialog
        open={confirmDisconnect}
        title={t('sync.disconnectTitle')}
        body={t('sync.disconnectBody')}
        confirmLabel={t('sync.disconnect')}
        onConfirm={() => {
          disconnect();
          setConfirmDisconnect(false);
          setNewSyncCode(null);
        }}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </section>
  );
}
