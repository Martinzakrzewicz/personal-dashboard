import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import type { Task } from '../../db/types';
import { cn } from '../../lib/cn';
import { groupTasksByZone } from './ordering';
import { TaskEditSheet } from './TaskEditSheet';
import { TaskRow } from './TaskRow';

interface TaskListProps {
  showCompletedSection?: boolean;
}

function ZoneHeading({
  title,
  count,
  expanded,
  onToggle,
  controls,
}: {
  title: string;
  count: number;
  expanded?: boolean;
  onToggle?: () => void;
  controls?: string;
}) {
  const content = (
    <>
      <span className="flex items-center gap-1.5">
        {onToggle ? (
          expanded ? (
            <ChevronDown size={16} aria-hidden="true" />
          ) : (
            <ChevronRight size={16} aria-hidden="true" />
          )
        ) : null}
        {title}
      </span>
      <span className="rounded-full bg-surface2 px-2 py-0.5 text-[11px] font-semibold text-muted">
        {count}
      </span>
    </>
  );

  if (onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={controls}
        className="touch-target flex w-full items-center justify-between gap-2 rounded-lg px-1 text-left text-sm font-semibold text-ink hover:bg-surface2"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-1 text-sm font-semibold text-ink">
      {content}
    </div>
  );
}

export function TaskList({ showCompletedSection = true }: TaskListProps) {
  const { t } = useTranslation();
  const tasks = useAppStore((state) => state.tasks);
  const [showLow, setShowLow] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const zones = groupTasksByZone(tasks);
  const hasOpen = zones.top.length + zones.middle.length + zones.low.length > 0;
  const hasAny = hasOpen || zones.completed.length > 0;

  return (
    <div className="space-y-4">
      {!hasAny ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {t('tasks.empty')}
        </p>
      ) : null}

      {zones.top.length > 0 ? (
        <section data-testid="task-zone-top" aria-label={t('tasks.topZone')} className="space-y-2">
          <ZoneHeading title={t('tasks.topZone')} count={zones.top.length} />
          {zones.top.map((task) => (
            <TaskRow key={task.id} task={task} variant="prominent" onOpen={setEditingTask} />
          ))}
        </section>
      ) : null}

      {zones.middle.length > 0 ? (
        <section
          data-testid="task-zone-middle"
          aria-label={t('tasks.middleZone')}
          className="space-y-2"
        >
          <ZoneHeading title={t('tasks.middleZone')} count={zones.middle.length} />
          {zones.middle.map((task) => (
            <TaskRow key={task.id} task={task} variant="standard" onOpen={setEditingTask} />
          ))}
        </section>
      ) : null}

      {zones.low.length > 0 ? (
        <section data-testid="task-zone-low">
          <ZoneHeading
            title={t('tasks.lowZone')}
            count={zones.low.length}
            expanded={showLow}
            onToggle={() => setShowLow((value) => !value)}
            controls="low-priority-zone"
          />
          {showLow ? (
            <div id="low-priority-zone" className="mt-1 overflow-hidden rounded-xl border border-line">
              {zones.low.map((task) => (
                <TaskRow key={task.id} task={task} variant="compact" onOpen={setEditingTask} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {showCompletedSection && zones.completed.length > 0 ? (
        <section
          data-testid="task-zone-completed"
          className={cn('border-t border-line pt-3', !hasOpen && 'pt-0')}
        >
          <ZoneHeading
            title={t('tasks.completed')}
            count={zones.completed.length}
            expanded={showCompleted}
            onToggle={() => setShowCompleted((value) => !value)}
            controls="completed-zone"
          />
          {showCompleted ? (
            <div id="completed-zone" className="mt-2 space-y-2">
              {zones.completed.map((task) => (
                <TaskRow key={task.id} task={task} variant="standard" onOpen={setEditingTask} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {editingTask ? (
        <TaskEditSheet task={editingTask} onClose={() => setEditingTask(null)} />
      ) : null}
    </div>
  );
}
