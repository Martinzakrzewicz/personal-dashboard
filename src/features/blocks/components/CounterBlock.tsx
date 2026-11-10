import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../app/store';
import { daysBetween, formatISODate, todayISO } from '../../../lib/dates';
import { cn } from '../../../lib/cn';
import { counterBlockConfigSchema } from '../definitions';
import type { BlockComponentProps } from './TasksBlock';

export function CounterBlock({ block, editMode }: BlockComponentProps) {
  const { t, i18n } = useTranslation();
  const updateBlock = useAppStore((state) => state.updateBlock);
  const parsed = counterBlockConfigSchema.safeParse(block.config);
  const config = parsed.success
    ? parsed.data
    : { version: 1 as const, label: '', targetDate: todayISO() };

  const [label, setLabel] = useState(config.label);

  useEffect(() => {
    setLabel(config.label);
  }, [block.id, config.label]);

  const days = daysBetween(todayISO(), config.targetDate);
  const locale = i18n.language;
  const formattedNumber = new Intl.NumberFormat(locale).format(Math.abs(days));
  const displayDate = formatISODate(config.targetDate, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex h-full flex-col justify-between gap-3">
      <div>
        {editMode ? (
          <div className="mb-3 space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t('blocks.counterLabel')}
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                onBlur={() => {
                  if (label !== config.label) {
                    void updateBlock(block.id, { config: { ...config, label } });
                  }
                }}
                placeholder={t('blocks.counterLabelPlaceholder')}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-line bg-surface2 px-2 text-sm font-normal normal-case tracking-normal text-ink placeholder:text-muted"
              />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t('blocks.counterTarget')}
              <input
                type="date"
                value={config.targetDate}
                onChange={(event) => {
                  if (event.target.value) {
                    void updateBlock(block.id, {
                      config: { ...config, targetDate: event.target.value },
                    });
                  }
                }}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-line bg-surface2 px-2 text-sm font-normal normal-case tracking-normal text-ink"
              />
            </label>
          </div>
        ) : null}

        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">
          {label || t('blocks.counter.name')}
        </p>
        <p className="mt-1 flex items-baseline gap-2">
          <span
            className={cn(
              'text-4xl font-semibold tabular-nums leading-none',
              days < 0 ? 'text-muted' : 'accent-text',
            )}
          >
            {days === 0 ? t('blocks.counterToday') : formattedNumber}
          </span>
          {days !== 0 ? (
            <span className="text-xs font-medium text-muted">
              {days > 0 ? t('blocks.counterDaysLeft') : t('blocks.counterDaysElapsed')}
            </span>
          ) : null}
        </p>
      </div>
      <p className="text-[11px] text-muted">{displayDate}</p>
    </div>
  );
}
