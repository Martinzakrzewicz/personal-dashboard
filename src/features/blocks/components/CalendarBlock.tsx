import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../app/store';
import type { Milestone, Task } from '../../../db/types';
import { formatISODate, formatWeekday, rollingWeek, todayISO } from '../../../lib/dates';
import { cn } from '../../../lib/cn';
import { TaskEditSheet } from '../../tasks/TaskEditSheet';
import { TaskRow } from '../../tasks/TaskRow';
import { MilestoneForm } from '../../milestones/MilestoneForm';
import { MilestoneList } from '../../milestones/MilestoneList';
import { MILESTONE_ICONS } from '../../milestones/icons';
import type { BlockComponentProps } from './TasksBlock';

export function CalendarBlock({ editMode }: BlockComponentProps) {
  const { t, i18n } = useTranslation();
  const tasks = useAppStore((state) => state.tasks);
  const milestones = useAppStore((state) => state.milestones);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const today = todayISO();
  const week = useMemo(() => rollingWeek(today), [today]);
  const weekStart = week[0] ?? today;
  const weekEnd = week[6] ?? today;

  const openTasks = tasks.filter(
    (task) =>
      task.status !== 'done' &&
      task.status !== 'cancelled' &&
      task.dueDate !== null &&
      task.dueDate >= weekStart &&
      task.dueDate <= weekEnd,
  );
  const weekMilestones = milestones.filter(
    (milestone) => milestone.date >= weekStart && milestone.date <= weekEnd,
  );

  const days = week.map((date) => ({
    date,
    tasks: openTasks.filter((task) => task.dueDate === date),
    milestones: weekMilestones.filter((milestone) => milestone.date === date),
  }));
  const hasEvents = days.some((day) => day.tasks.length > 0 || day.milestones.length > 0);

  const rangeLabel = `${formatISODate(weekStart, i18n.language, {
    month: 'short',
    day: 'numeric',
  })} – ${formatISODate(weekEnd, i18n.language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t('calendar.thisWeek')}
        </p>
        <p className="text-[11px] text-muted">{rangeLabel}</p>
      </div>

      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {days.map((day) => {
          const isToday = day.date === today;
          const count = day.tasks.length + day.milestones.length;
          return (
            <div
              key={day.date}
              className={cn(
                'flex min-w-0 flex-col items-center rounded-xl border px-0.5 py-1.5',
                isToday ? 'accent-tint border' : 'border-line bg-surface2',
              )}
            >
              <span className="text-[9px] font-medium uppercase tracking-wide text-muted">
                {formatWeekday(day.date, i18n.language)}
              </span>
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  isToday ? 'bg-[color:var(--space-accent)] text-[color:var(--space-accent-contrast)]' : 'text-ink',
                )}
              >
                {formatISODate(day.date, i18n.language, { day: 'numeric' })}
              </span>
              <span
                className="mt-1 h-1 w-1 rounded-full"
                style={{
                  backgroundColor: count > 0 ? 'var(--space-accent)' : 'transparent',
                }}
              />
            </div>
          );
        })}
      </div>

      {hasEvents ? (
        <div className="space-y-3">
          {days
            .filter((day) => day.tasks.length > 0 || day.milestones.length > 0)
            .map((day) => {
              const isToday = day.date === today;
              return (
                <div key={day.date} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1">
                    <h3
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wide',
                        isToday ? 'accent-text' : 'text-muted',
                      )}
                    >
                      {isToday ? t('calendar.today') : formatWeekday(day.date, i18n.language)}
                    </h3>
                    <span className="text-[11px] text-muted">
                      {formatISODate(day.date, i18n.language, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {day.milestones.map((milestone) => {
                      const Icon = MILESTONE_ICONS[milestone.type];
                      return (
                        <button
                          key={milestone.id}
                          type="button"
                          onClick={() => setEditingMilestone(milestone)}
                          className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-surface2"
                        >
                          <Icon
                            size={14}
                            className="shrink-0 accent-text"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                            {milestone.title}
                          </span>
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted">
                            {t(`milestones.types.${milestone.type}`)}
                          </span>
                        </button>
                      );
                    })}
                    {day.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        variant="compact"
                        onOpen={setEditingTask}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line px-3 py-5 text-center text-sm text-muted">
          {t('calendar.summaryEmpty')}
        </p>
      )}

      {editMode ? (
        <p className="text-[11px] text-muted">{t('blocks.calendarSummaryHint')}</p>
      ) : null}

      <MilestoneList />

      {editingTask ? (
        <TaskEditSheet task={editingTask} onClose={() => setEditingTask(null)} />
      ) : null}
      {editingMilestone ? (
        <MilestoneForm milestone={editingMilestone} onClose={() => setEditingMilestone(null)} />
      ) : null}
    </div>
  );
}
