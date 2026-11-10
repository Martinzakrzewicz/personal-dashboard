import { AlertTriangle, CalendarClock, Check, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import type { Importance, Space, Task } from '../../db/types';
import { formatISODate, isOverdue, relativeDueLabel } from '../../lib/dates';
import { cn } from '../../lib/cn';
import { SpaceBadge } from '../spaces/SpaceBadge';

export const IMPORTANCE_VAR: Record<Importance, string> = {
  critical: 'var(--importance-critical)',
  high: 'var(--importance-high)',
  medium: 'var(--importance-medium)',
  low: 'var(--importance-low)',
};

export type TaskRowVariant = 'prominent' | 'standard' | 'compact';

interface TaskRowProps {
  task: Task;
  variant: TaskRowVariant;
  onOpen: (task: Task) => void;
  space?: Space;
  onToggle?: (task: Task) => void | Promise<void>;
}

function DueDateChip({ task, subtle }: { task: Task; subtle?: boolean }) {
  const { t, i18n } = useTranslation();
  if (!task.dueDate) return null;
  const overdue = isOverdue(task.dueDate, task.status);
  const label = overdue
    ? formatISODate(task.dueDate, i18n.language)
    : relativeDueLabel(task.dueDate, i18n.language, t);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        subtle ? 'bg-surface2' : '',
      )}
      style={
        overdue
          ? {
              color: 'var(--danger)',
              backgroundColor: 'color-mix(in srgb, var(--danger) 12%, transparent)',
            }
          : {
              color: 'var(--muted)',
              backgroundColor: subtle ? undefined : 'var(--surface-2)',
            }
      }
    >
      <CalendarClock size={12} aria-hidden="true" />
      <span>{label}</span>
      {overdue ? <span className="sr-only">— {t('tasks.overdue')}</span> : null}
    </span>
  );
}

function ImportanceChip({
  importance,
  showLabel = true,
}: {
  importance: Importance;
  showLabel?: boolean;
}) {
  const { t } = useTranslation();
  const color = IMPORTANCE_VAR[importance];
  if (!showLabel) {
    return (
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)`,
      }}
    >
      {t(`importance.${importance}`)}
    </span>
  );
}

export function TaskRow({ task, variant, onOpen, space, onToggle }: TaskRowProps) {
  const { t } = useTranslation();
  const toggleTask = useAppStore((state) => state.toggleTask);
  const completed = task.status === 'done' || task.status === 'cancelled';
  const overdue = isOverdue(task.dueDate, task.status);
  const urgentIcon =
    task.importance === 'critical' ? (
      <AlertTriangle size={20} className="shrink-0" aria-hidden="true" />
    ) : (
      <Flame size={20} className="shrink-0" aria-hidden="true" />
    );

  return (
    <div
      className={cn(
        'group flex w-full items-start gap-2 rounded-xl border text-left transition',
        variant === 'prominent'
          ? 'accent-tint border p-3.5 shadow-card md:p-4'
          : variant === 'standard'
            ? 'card p-2.5 md:p-3'
            : 'border-line bg-surface px-2 py-1',
        completed && 'opacity-70',
        overdue && variant !== 'prominent' && 'border-[color:var(--danger)]',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label={t('tasks.toggleDone')}
        onClick={() => void (onToggle ? onToggle(task) : toggleTask(task.id))}
        className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full md:-my-1"
      >
        <span
          className={cn(
            'flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition',
            completed
              ? 'border-[color:var(--success)] bg-[color:var(--success)] text-[color:var(--bg)]'
              : 'border-line bg-surface text-transparent group-hover:border-[color:var(--space-accent)]',
          )}
        >
          <Check size={13} strokeWidth={3} aria-hidden="true" />
        </span>
      </button>

      <button
        type="button"
        onClick={() => onOpen(task)}
        className="min-w-0 flex-1 text-left"
      >
        {variant === 'prominent' ? (
          <div className="flex items-start gap-2">
            <span style={{ color: IMPORTANCE_VAR[task.importance] }} className="mt-0.5">
              {urgentIcon}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'break-words text-[15px] font-semibold leading-snug text-ink md:text-base',
                  completed && 'line-through',
                )}
              >
                {task.title}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <ImportanceChip importance={task.importance} />
                <DueDateChip task={task} />
                {space ? <SpaceBadge space={space} /> : null}
                {overdue ? (
                  <span className="text-[11px] font-semibold text-danger">{t('tasks.overdue')}</span>
                ) : null}
              </div>
            </div>
          </div>
        ) : variant === 'standard' ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <ImportanceChip importance={task.importance} showLabel={false} />
              <p
                className={cn(
                  'min-w-0 break-words text-sm font-medium leading-snug text-ink',
                  completed && 'line-through',
                )}
              >
                {task.title}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {space ? <SpaceBadge space={space} /> : null}
              {overdue ? (
                <span className="text-[11px] font-semibold text-danger">{t('tasks.overdue')}</span>
              ) : null}
              <DueDateChip task={task} subtle />
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <ImportanceChip importance={task.importance} showLabel={false} />
            {space ? <SpaceBadge space={space} showName={false} /> : null}
            <p
              className={cn(
                'min-w-0 flex-1 truncate text-sm text-ink',
                completed && 'line-through',
              )}
            >
              {task.title}
            </p>
            {overdue ? (
              <span className="shrink-0 text-[10px] font-semibold uppercase text-danger">
                {t('tasks.overdue')}
              </span>
            ) : (
              <DueDateChip task={task} />
            )}
          </div>
        )}
      </button>
    </div>
  );
}
