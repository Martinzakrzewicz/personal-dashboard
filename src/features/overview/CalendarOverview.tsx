import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import type { Milestone, Space, Task } from '../../db/types';
import {
  addDaysISO,
  addMonthsISO,
  formatISODate,
  formatLongDate,
  formatMonthYear,
  formatWeekday,
  fromISODate,
  isSameMonth,
  mondayIndex,
  monthGridDates,
  rollingWeek,
  todayISO,
} from '../../lib/dates';
import { cn } from '../../lib/cn';
import { Button } from '../../components/ui/Button';
import { TaskEditSheet } from '../tasks/TaskEditSheet';
import { TaskRow } from '../tasks/TaskRow';
import { MILESTONE_ICONS } from '../milestones/icons';
import { SpaceBadge } from '../spaces/SpaceBadge';
import { notifyLocalChange } from '../sync/events';
import { OverviewFilters } from './OverviewFilters';
import { useOverview } from './useOverview';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  space: Space;
  task?: Task;
  milestone?: Milestone;
}

function EventPill({
  event,
  onOpenTask,
}: {
  event: CalendarEvent;
  onOpenTask: (task: Task) => void;
}) {
  const { t } = useTranslation();
  const Icon = event.milestone ? MILESTONE_ICONS[event.milestone.type] : null;
  const style = {
    borderLeftColor: event.space.color,
    backgroundColor: `color-mix(in srgb, ${event.space.color} 10%, var(--surface))`,
  };
  const content = (
    <>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: event.space.color }}
        aria-hidden="true"
      />
      {Icon ? <Icon size={11} className="shrink-0 text-muted" aria-hidden="true" /> : null}
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink">
        {event.title}
      </span>
    </>
  );

  if (event.task) {
    return (
      <button
        type="button"
        onClick={() => onOpenTask(event.task as Task)}
        className="flex min-h-[44px] w-full items-center gap-1.5 rounded-lg border-l-2 px-1.5 py-1 text-left hover:brightness-95"
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className="flex min-h-[44px] w-full items-center gap-1.5 rounded-lg border-l-2 px-1.5 py-1"
      style={style}
      title={event.milestone ? t(`milestones.types.${event.milestone.type}`) : undefined}
    >
      {content}
    </div>
  );
}

export function CalendarOverview() {
  const { t, i18n } = useTranslation();
  const { snapshot, loading, reload } = useOverview();
  const updateTask = useAppStore((state) => state.updateTask);
  const [selectedSpaceId, setSelectedSpaceId] = useState('all');
  const [view, setView] = useState<CalendarView>('month');
  const [anchor, setAnchor] = useState(todayISO());
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  if (loading || !snapshot) {
    return <p className="py-10 text-center text-sm text-muted">{t('detail.loading')}</p>;
  }

  const today = todayISO();
  const locale = i18n.language;
  const spaces = snapshot.spaces.map((entry) => entry.space);
  const spaceById = new Map(spaces.map((space) => [space.id, space]));
  const allTasks = snapshot.spaces.flatMap((entry) => entry.tasks);
  const allMilestones = snapshot.spaces.flatMap((entry) => entry.milestones);

  const inSpace = (spaceId: string) => selectedSpaceId === 'all' || selectedSpaceId === spaceId;
  const openTasks = allTasks.filter(
    (task) =>
      inSpace(task.spaceId) && task.status !== 'done' && task.status !== 'cancelled',
  );
  const openTasksAllSpaces = allTasks.filter(
    (task) => task.status !== 'done' && task.status !== 'cancelled',
  );
  const milestones = allMilestones.filter((milestone) => inSpace(milestone.spaceId));

  const counts: Record<string, number> = { all: openTasksAllSpaces.length };
  for (const entry of snapshot.spaces) {
    counts[entry.space.id] = openTasksAllSpaces.filter(
      (task) => task.spaceId === entry.space.id,
    ).length;
  }

  const tasksByDate = new Map<string, Task[]>();
  for (const task of openTasks) {
    if (!task.dueDate) continue;
    const list = tasksByDate.get(task.dueDate) ?? [];
    list.push(task);
    tasksByDate.set(task.dueDate, list);
  }
  const milestonesByDate = new Map<string, Milestone[]>();
  for (const milestone of milestones) {
    const list = milestonesByDate.get(milestone.date) ?? [];
    list.push(milestone);
    milestonesByDate.set(milestone.date, list);
  }

  const eventsForDate = (date: string): CalendarEvent[] => {
    const tasks = [...(tasksByDate.get(date) ?? [])].sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
    const dayMilestones = [...(milestonesByDate.get(date) ?? [])].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
    return [
      ...tasks.map((task) => ({
        id: task.id,
        title: task.title,
        date,
        space: spaceById.get(task.spaceId) as Space,
        task,
      })),
      ...dayMilestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        date,
        space: spaceById.get(milestone.spaceId) as Space,
        milestone,
      })),
    ].filter((event) => Boolean(event.space));
  };

  const overdueTasks = openTasks.filter(
    (task) => task.dueDate !== null && task.dueDate < today,
  );
  const unscheduledTasks = openTasks.filter((task) => task.dueDate === null);

  const editingEntry = editingTask
    ? snapshot.spaces.find((entry) => entry.space.id === editingTask.spaceId)
    : null;

  const toggle = async (task: Task) => {
    const nextStatus = task.status === 'done' ? 'pending' : 'done';
    await updateTask(task.id, { status: nextStatus }, task.spaceId);
    await reload();
    notifyLocalChange();
  };

  const openDay = (date: string) => {
    setSelectedDate(date);
    setAnchor(date);
    setView('day');
  };

  const switchView = (next: CalendarView) => {
    if (next !== 'month') {
      setAnchor(selectedDate);
    }
    setView(next);
  };

  const step = (direction: -1 | 1) => {
    let next = anchor;
    if (view === 'month') next = addMonthsISO(anchor, direction);
    if (view === 'week') next = addDaysISO(anchor, direction * 7);
    if (view === 'day') next = addDaysISO(anchor, direction);
    setAnchor(next);
    setSelectedDate(next);
  };

  const goToday = () => {
    setAnchor(today);
    setSelectedDate(today);
  };

  const weekDates = rollingWeek(anchor);
  const weekStart = weekDates[0] ?? anchor;
  const weekEnd = weekDates[6] ?? anchor;
  const title =
    view === 'month'
      ? formatMonthYear(fromISODate(anchor), locale)
      : view === 'week'
        ? `${formatISODate(weekStart, locale, {
            month: 'short',
            day: 'numeric',
          })} – ${formatISODate(weekEnd, locale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}`
        : formatLongDate(anchor, locale);

  const monthDates = monthGridDates(anchor);
  const weekdayLabels = rollingWeek(addDaysISO(today, -mondayIndex(today))).map((date) =>
    formatWeekday(date, locale),
  );
  const dayEvents = eventsForDate(anchor);
  const dayTasks = dayEvents.flatMap((event) => (event.task ? [event.task] : []));
  const dayMilestones = dayEvents.flatMap((event) =>
    event.milestone ? [event.milestone] : [],
  );

  const views: Array<{ id: CalendarView; label: string }> = [
    { id: 'month', label: t('calendar.monthView') },
    { id: 'week', label: t('calendar.weekView') },
    { id: 'day', label: t('calendar.dayView') },
  ];

  return (
    <div className="space-y-4">
      <OverviewFilters
        spaces={spaces}
        selectedSpaceId={selectedSpaceId}
        onChange={setSelectedSpaceId}
        counts={counts}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => step(-1)}
            aria-label={t('calendar.previous')}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="sm" onClick={goToday}>
            {t('calendar.today')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => step(1)}
            aria-label={t('calendar.next')}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </Button>
        </div>

        <h3 className="order-first w-full text-center text-base font-semibold text-ink md:order-none md:w-auto md:flex-1 md:text-left">
          {title}
        </h3>

        <div className="flex rounded-xl border border-line bg-surface p-0.5" role="group">
          {views.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => switchView(option.id)}
              aria-pressed={view === option.id}
              className={cn(
                'min-h-[44px] rounded-lg px-2.5 text-xs font-medium transition sm:px-3',
                view === option.id
                  ? 'bg-[color:var(--space-accent)] text-[color:var(--space-accent-contrast)]'
                  : 'text-muted hover:bg-surface2 hover:text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid grid-cols-7 border-b border-line">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-line">
            {monthDates.map((date) => {
              const events = eventsForDate(date);
              const outside = !isSameMonth(date, anchor);
              const isToday = date === today;
              return (
                <div
                  key={date}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDay(date)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openDay(date);
                    }
                  }}
                  aria-label={t('calendar.cellLabel', {
                    date: formatLongDate(date, locale),
                    count: events.length,
                  })}
                  className={cn(
                    'min-h-[62px] cursor-pointer bg-surface p-1 transition hover:bg-surface2 md:min-h-[110px] md:p-1.5',
                    outside && 'bg-surface2 text-muted',
                    isToday && 'ring-1 ring-inset ring-[color:var(--space-accent)]',
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                        isToday
                          ? 'bg-[color:var(--space-accent)] text-[color:var(--space-accent-contrast)]'
                          : 'text-ink',
                        outside && !isToday && 'text-muted',
                      )}
                    >
                      {formatISODate(date, locale, { day: 'numeric' })}
                    </span>
                    {events.length > 0 ? (
                      <span className="text-[9px] text-muted md:hidden">{events.length}</span>
                    ) : null}
                  </div>

                  <div className="mt-1 hidden space-y-0.5 md:block">
                    {events.slice(0, 2).map((event) => (
                      <span
                        key={`${event.task ? 'task' : 'milestone'}-${event.id}`}
                        className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium text-ink"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${event.space.color} 13%, var(--surface))`,
                        }}
                        title={event.title}
                      >
                        <span
                          className="h-1 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: event.space.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{event.title}</span>
                      </span>
                    ))}
                    {events.length > 2 ? (
                      <span className="block px-1 text-[9px] text-muted">
                        {t('calendar.more', { count: events.length - 2 })}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex gap-0.5 md:hidden">
                    {events.slice(0, 3).map((event) => (
                      <span
                        key={`${event.task ? 'task' : 'milestone'}-${event.id}`}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: event.space.color }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === 'week' ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {weekDates.map((date) => {
            const events = eventsForDate(date);
            const isToday = date === today;
            return (
              <section
                key={date}
                className={cn(
                  'rounded-xl border bg-surface p-2',
                  isToday ? 'accent-tint border' : 'border-line',
                )}
              >
                <button
                  type="button"
                  onClick={() => openDay(date)}
                  className="mb-2 flex min-h-[44px] w-full flex-col items-start justify-center rounded-lg px-1 text-left hover:bg-surface2"
                >
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wide',
                      isToday ? 'accent-text' : 'text-muted',
                    )}
                  >
                    {isToday ? t('calendar.today') : formatWeekday(date, locale)}
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {formatISODate(date, locale, { month: 'short', day: 'numeric' })}
                  </span>
                </button>
                <div className="space-y-1">
                  {events.length === 0 ? (
                    <p className="px-1 py-2 text-center text-[11px] text-muted">—</p>
                  ) : (
                    events.map((event) => (
                      <EventPill
                        key={`${event.task ? 'task' : 'milestone'}-${event.id}`}
                        event={event}
                        onOpenTask={setEditingTask}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {view === 'day' ? (
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-3 md:p-4">
          {dayEvents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
              {t('calendar.noEvents')}
            </p>
          ) : (
            <>
              {dayMilestones.map((milestone) => {
                const Icon = MILESTONE_ICONS[milestone.type];
                const space = spaceById.get(milestone.spaceId);
                return (
                  <div
                    key={milestone.id}
                    className="flex min-h-[44px] items-center gap-2 rounded-lg border border-line px-2 py-1"
                  >
                    <Icon size={15} className="shrink-0 accent-text" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                      {milestone.title}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted">
                      {t(`milestones.types.${milestone.type}`)}
                    </span>
                    {space ? <SpaceBadge space={space} /> : null}
                  </div>
                );
              })}
              {dayTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  variant="standard"
                  onOpen={setEditingTask}
                  onToggle={toggle}
                  space={spaceById.get(task.spaceId)}
                />
              ))}
            </>
          )}
        </div>
      ) : null}

      {overdueTasks.length > 0 ? (
        <details className="rounded-xl border border-[color:var(--danger)] bg-[var(--danger-soft)] px-3 py-1">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-danger">
            <span>{t('calendar.overdue')}</span>
            <span className="rounded-full bg-[color:var(--surface)] px-2 py-0.5 text-[10px]">
              {overdueTasks.length}
            </span>
          </summary>
          <div className="space-y-1.5 pb-2">
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
        </details>
      ) : null}

      {unscheduledTasks.length > 0 ? (
        <details className="rounded-xl border border-line bg-surface px-3 py-1">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <span>{t('calendar.unscheduled')}</span>
            <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px]">
              {unscheduledTasks.length}
            </span>
          </summary>
          <div className="space-y-1.5 pb-2">
            {unscheduledTasks.map((task) => (
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
        </details>
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
