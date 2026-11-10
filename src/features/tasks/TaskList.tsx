import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import type { Task } from '../../db/types';
import { cn } from '../../lib/cn';
import { groupTasksByZone } from './ordering';
import { TaskEditSheet } from './TaskEditSheet';
import { TaskRow } from './TaskRow';
import { TaskZoneHeading } from './TaskZoneHeading';

interface TaskListProps {
  showCompletedSection?: boolean;
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
          <TaskZoneHeading title={t('tasks.topZone')} count={zones.top.length} />
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
          <TaskZoneHeading title={t('tasks.middleZone')} count={zones.middle.length} />
          {zones.middle.map((task) => (
            <TaskRow key={task.id} task={task} variant="standard" onOpen={setEditingTask} />
          ))}
        </section>
      ) : null}

      {zones.low.length > 0 ? (
        <section data-testid="task-zone-low">
          <TaskZoneHeading
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
          <TaskZoneHeading
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
