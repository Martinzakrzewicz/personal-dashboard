import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field, TextInput } from '../../components/ui/Field';
import { cn } from '../../lib/cn';
import { getSpaceIcon, SPACE_COLORS, SPACE_ICON_OPTIONS } from './icons';

interface CreateSpaceDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateSpaceDialog({ open, onClose }: CreateSpaceDialogProps) {
  const { t } = useTranslation();
  const createSpace = useAppStore((state) => state.createSpace);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(SPACE_COLORS[0]);
  const [icon, setIcon] = useState<string>(SPACE_ICON_OPTIONS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setColor(SPACE_COLORS[0]);
    setIcon(SPACE_ICON_OPTIONS[0]);
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t('errors.spaceNameRequired'));
      return;
    }
    setSaving(true);
    const created = await createSpace({ name: name.trim(), color, icon });
    setSaving(false);
    if (created) close();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('spaces.newTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="space-create-form" disabled={saving}>
            {t('spaces.create')}
          </Button>
        </>
      }
    >
      <form id="space-create-form" onSubmit={onSubmit} className="space-y-4">
        <Field label={t('spaces.name')} htmlFor="space-name">
          <TextInput
            id="space-name"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('spaces.namePlaceholder')}
          />
        </Field>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('spaces.color')}
          </p>
          <div className="flex flex-wrap gap-2">
            {SPACE_COLORS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={option}
                aria-pressed={color === option}
                onClick={() => setColor(option)}
                className={cn(
                  'h-11 w-11 rounded-full border-2 transition',
                  color === option ? 'border-ink scale-105' : 'border-transparent',
                )}
                style={{ backgroundColor: option }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('spaces.icon')}
          </p>
          <div className="flex flex-wrap gap-2">
            {SPACE_ICON_OPTIONS.map((option) => {
              const Icon = getSpaceIcon(option);
              return (
                <button
                  key={option}
                  type="button"
                  aria-label={`${t('spaces.icon')}: ${option}`}
                  aria-pressed={icon === option}
                  onClick={() => setIcon(option)}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl border transition',
                    icon === option
                      ? 'border-[color:var(--space-accent)] bg-surface2 text-ink'
                      : 'border-line text-muted hover:bg-surface2',
                  )}
                >
                  <Icon size={20} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
