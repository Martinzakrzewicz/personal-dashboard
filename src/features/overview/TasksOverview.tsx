import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import type { Task } from '../../db/types';
import { groupTasksByZone } from '../tasks/ordering';
import { TaskEditSheet } from '../tasks/TaskEditSheet';
import { TaskRow } from '../tasks/TaskRow';
import { TaskZoneHeading } from '../tasks/TaskZoneHeading';
import { notifyLocalChange } from '../sync/events';
import { OverviewFilters } from './OverviewFilters';
import { useOverview } from './useOverview';

export function TasksOverview() {
  const { t } = useTranslation();
  const { snapshot, loading, reload } = useOverview();
  const updateTask = useAppStore((state) => state.updateTask);
  const [selectedSpaceId, setSelectedSpaceId] = useState('all');
  const [showLow, setShowLow] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  if (loading || !snapshot) {
    return <p className="py-10 text-center text-sm text-muted">{t('detail.loading')}</p>;
  }

  const spaces = snapshot.spaces.map((entry) => entry.space);
  const spaceById = new Map(spaces.map((space) => [space.id, space]));
  const allTasks = snapshot.spaces.flatMap((entry) => entry.tasks);
  const counts: Record<string, number> = { all: allTasks.length };
  for (const entry of snapshot.spaces) counts[entry.space.id] = entry.tasks.length;

  const filtered =
    selectedSpaceId === 'all'
      ? allTasks
      : allTasks.filter((task) => task.spaceId === selectedSpaceId);
  const zones = groupTasksByZone(filtered);

  const editingEntry = editingTask
    ? snapshot.spaces.find((entry) => entry.space.id === editingTask.spaceId)
    : null;

  const toggle = async (task: Task) => {
    const nextStatus = task.status === 'done' ? 'pending' : 'done';
    await updateTask(task.id, { status: nextStatus }, task.spaceId);
    await reload();
    notifyLocalChange();
  };

  const hasAny = zones.top.length + zones.middle.length + zones.low.length + zones.completed.length > 0;

  return (
    <div className="space-y-4">
      <OverviewFilters
        spaces={spaces}
        selectedSpaceId={selectedSpaceId}
        onChange={setSelectedSpaceId}
        counts={counts}
      />

      {!hasAny ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          {t('detail.emptyTasks')}
        </p>
      ) : null}

      {zones.top.length > 0 ? (
        <section className="space-y-2">
          <TaskZoneHeading title={t('tasks.topZone')} count={zones.top.length} />
          {zones.top.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              variant="prominent"
              onOpen={setEditingTask}
              onToggle={toggle}
              space={spaceById.get(task.spaceId)}
            />
          ))}
        </section>
      ) : null}

      {zones.middle.length > 0 ? (
        <section className="space-y-2">
          <TaskZoneHeading title={t('tasks.middleZone')} count={zones.middle.length} />
          {zones.middle.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              variant="standard"
              onOpen={setEditingTask}
              onToggle={toggle}
              space={spaceById.get(task.spaceId)}
            />
          ))}
        </section>
      ) : null}

      {zones.low.length > 0 ? (
        <section>
          <TaskZoneHeading
            title={t('tasks.lowZone')}
            count={zones.low.length}
            expanded={showLow}
            onToggle={() => setShowLow((value) => !value)}
            controls="overview-low-zone"
          />
          {showLow ? (
            <div
              id="overview-low-zone"
              className="mt-1 overflow-hidden rounded-xl border border-line"
            >
              {zones.low.map((task) => (
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
          ) : null}
        </section>
      ) : null}

      {zones.completed.length > 0 ? (
        <section className="border-t border-line pt-3">
          <TaskZoneHeading
            title={t('tasks.completed')}
            count={zones.completed.length}
            expanded={showCompleted}
            onToggle={() => setShowCompleted((value) => !value)}
            controls="overview-completed-zone"
          />
          {showCompleted ? (
            <div id="overview-completed-zone" className="mt-2 space-y-2">
              {zones.completed.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  variant="standard"
                  onOpen={setEditingTask}
                  onToggle={toggle}
                  space={spaceById.get(task.spaceId)}
                />
              ))}
            </div>
          ) : null}
        </section>
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
