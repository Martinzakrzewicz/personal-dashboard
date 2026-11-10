import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import type { Milestone, Task } from '../../db/types';
import {
  addDaysISO,
  formatISODate,
  formatWeekday,
  todayISO,
} from '../../lib/dates';
import { cn } from '../../lib/cn';
import { TaskEditSheet } from '../tasks/TaskEditSheet';
import { TaskRow } from '../tasks/TaskRow';
import { MILESTONE_ICONS } from '../milestones/icons';
import { SpaceBadge } from '../spaces/SpaceBadge';
import { notifyLocalChange } from '../sync/events';
import { OverviewFilters } from './OverviewFilters';
import { useOverview } from './useOverview';

const RANGE_DAYS = 30;

export function CalendarOverview() {
  const { t, i18n } = useTranslation();
  const { snapshot, loading, reload } = useOverview();
  const updateTask = useAppStore((state) => state.updateTask);
  const [selectedSpaceId, setSelectedSpaceId] = useState('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  if (loading || !snapshot) {
    return <p className="py-10 text-center text-sm text-muted">{t('detail.loading')}</p>;
  }

  const spaces = snapshot.spaces.map((entry) => entry.space);
  const spaceById = new Map(spaces.map((space) => [space.id, space]));
  const allTasks = snapshot.spaces.flatMap((entry) => entry.tasks);
  const allMilestones = snapshot.spaces.flatMap((entry) => entry.milestones);
  const counts: Record<string, number> = { all: allTasks.length };
  for (const entry of snapshot.spaces) counts[entry.space.id] = entry.tasks.length;

  const inSpace = (spaceId: string) => selectedSpaceId === 'all' || selectedSpaceId === spaceId;
  const openTasks = allTasks.filter(
    (task) =>
      inSpace(task.spaceId) && task.status !== 'done' && task.status !== 'cancelled',
  );
  const milestones = allMilestones.filter((milestone) => inSpace(milestone.spaceId));

  const today = todayISO();
  const end = addDaysISO(today, RANGE_DAYS - 1);
  const overdueTasks = openTasks.filter((task) => task.dueDate !== null && task.dueDate < today);
  const upcomingTasks = openTasks.filter(
    (task) => task.dueDate !== null && task.dueDate >= today && task.dueDate <= end,
  );
  const unscheduled = openTasks.filter((task) => task.dueDate === null);

  const days = Array.from({ length: RANGE_DAYS }, (_, index) => addDaysISO(today, index))
    .map((date) => ({
      date,
      tasks: upcomingTasks.filter((task) => task.dueDate === date),
      milestones: milestones.filter((milestone) => milestone.date === date),
    }))
    .filter((day) => day.tasks.length > 0 || day.milestones.length > 0);

  const editingEntry = editingTask
    ? snapshot.spaces.find((entry) => entry.space.id === editingTask.spaceId)
    : null;

  const toggle = async (task: Task) => {
    const nextStatus = task.status === 'done' ? 'pending' : 'done';
    await updateTask(task.id, { status: nextStatus }, task.spaceId);
    await reload();
    notifyLocalChange();
  };

  const renderMilestone = (milestone: Milestone) => {
    const Icon = MILESTONE_ICONS[milestone.type];
    const space = spaceById.get(milestone.spaceId);
    return (
      <div
        key={milestone.id}
        className="flex min-h-[44px] items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full accent-soft">
          <Icon size={14} className="accent-text" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
          {milestone.title}
        </span>
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted">
          {t(`milestones.types.${milestone.type}`)}
        </span>
        {space ? <SpaceBadge space={space} /> : null}
      </div>
    );
  };

  const hasAny =
    overdueTasks.length > 0 || days.length > 0 || unscheduled.length > 0;

  return (
    <div className="space-y-4">
      <OverviewFilters
        spaces={spaces}
        selectedSpaceId={selectedSpaceId}
        onChange={setSelectedSpaceId}
        counts={counts}
      />

      <p className="text-xs font-medium text-muted">
        {t('detail.nextDays', { count: RANGE_DAYS })}
      </p>

      {overdueTasks.length > 0 ? (
        <section className="space-y-2 rounded-2xl border border-[color:var(--danger)] bg-[var(--danger-soft)] p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-danger">
            {t('detail.overdue')}
          </h3>
          <div className="space-y-1.5">
            {overdueTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                variant="compact"
                onOpen={setEditingTask}
                onToggle={toggle}
                space={spaceById.get(task.spaceId)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {days.map((day) => {
        const isToday = day.date === today;
        return (
          <section key={day.date} className="space-y-1.5">
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
                {formatISODate(day.date, i18n.language, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="space-y-1.5">
              {day.milestones.map(renderMilestone)}
              {day.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  variant="compact"
                  onOpen={setEditingTask}
                  onToggle={toggle}
                  space={spaceById.get(task.spaceId)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {unscheduled.length > 0 ? (
        <section className="border-t border-line pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('detail.unscheduled')}
          </h3>
          <div className="space-y-1.5">
            {unscheduled.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                variant="compact"
                onOpen={setEditingTask}
                onToggle={toggle}
                space={spaceById.get(task.spaceId)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!hasAny ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          {t('detail.emptyCalendar')}
        </p>
      ) : null}

      {editingTask ? (
        <TaskEditSheet
          task={editingTask}
          spaceId={editingTask.spaceId}
          milestones={editingEntry?.milestones ?? []}
          onChanged={() => {
            void reload();
            notifyLocalChange();
          }}
          onClose={() => setEditingTask(null)}
        />
      ) : null}
    </div>
  );
}
