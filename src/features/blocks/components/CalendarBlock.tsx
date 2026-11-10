import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../app/store';
import type { Milestone, Task } from '../../../db/types';
import { TaskEditSheet } from '../../tasks/TaskEditSheet';
import { TaskRow } from '../../tasks/TaskRow';
import { MilestoneForm } from '../../milestones/MilestoneForm';
import { MilestoneList } from '../../milestones/MilestoneList';
import { MILESTONE_ICONS } from '../../milestones/icons';
import {
  addDaysISO,
  formatISODate,
  formatWeekday,
  todayISO,
} from '../../../lib/dates';
import { cn } from '../../../lib/cn';
import { calendarBlockConfigSchema } from '../definitions';
import type { BlockComponentProps } from './TasksBlock';

export function CalendarBlock({ block, editMode }: BlockComponentProps) {
  const { t, i18n } = useTranslation();
  const tasks = useAppStore((state) => state.tasks);
  const milestones = useAppStore((state) => state.milestones);
  const updateBlock = useAppStore((state) => state.updateBlock);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const parsed = calendarBlockConfigSchema.safeParse(block.config);
  const config = parsed.success ? parsed.data : { version: 1 as const, days: 14 as const };
  const days = config.days;

  const today = todayISO();
  const end = addDaysISO(today, days - 1);

  const visibleTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.dueDate !== null &&
          task.dueDate >= today &&
          task.dueDate <= end &&
          task.status !== 'done' &&
          task.status !== 'cancelled',
      ),
    [tasks, today, end],
  );

  const daysToShow = useMemo(() => {
    return Array.from({ length: days }, (_, index) => addDaysISO(today, index))
      .map((date) => ({
        date,
        tasks: visibleTasks.filter((task) => task.dueDate === date),
        milestones: milestones
          .filter((milestone) => milestone.date === date)
          .sort((a, b) => a.title.localeCompare(b.title)),
      }))
      .filter((day) => day.tasks.length > 0 || day.milestones.length > 0);
  }, [days, today, visibleTasks, milestones]);

  const hasEvents = daysToShow.length > 0;

  return (
    <div className="space-y-4">
      {editMode ? (
        <label className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface2 px-2 py-1.5 text-xs font-medium text-muted">
          {t('blocks.calendarDays')}
          <select
            value={days}
            onChange={(event) =>
              void updateBlock(block.id, {
                config: { ...config, days: Number(event.target.value) === 7 ? 7 : 14 },
              })
            }
            className="min-h-[44px] rounded-lg border border-line bg-surface px-2 text-xs text-ink"
          >
            <option value={7}>{t('blocks.days7')}</option>
            <option value={14}>{t('blocks.days14')}</option>
          </select>
        </label>
      ) : null}

      {hasEvents ? (
        <div className="space-y-3">
          {daysToShow.map((day) => {
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
                          className="shrink-0 text-[color:var(--space-accent)]"
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
          {t('calendar.empty', { count: days })}
        </p>
      )}

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
