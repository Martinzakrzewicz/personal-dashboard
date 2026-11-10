import type { Task } from '../../db/types';

/**
 * Zone ordering: due date ascending with null dates last, then manual
 * orderIndex ascending, then creation time for a deterministic fallback.
 */
export function sortTasksForZone(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      const byDate = a.dueDate.localeCompare(b.dueDate);
      if (byDate !== 0) return byDate;
    } else if (a.dueDate) {
      return -1;
    } else if (b.dueDate) {
      return 1;
    }

    if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export interface TaskZones {
  top: Task[];
  middle: Task[];
  low: Task[];
  completed: Task[];
}

export function groupTasksByZone(tasks: Task[]): TaskZones {
  const open = tasks.filter((task) => task.status === 'pending' || task.status === 'in_progress');
  const completed = tasks
    .filter((task) => task.status === 'done' || task.status === 'cancelled')
    .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));

  return {
    top: sortTasksForZone(open.filter((task) => task.importance === 'critical' || task.importance === 'high')),
    middle: sortTasksForZone(open.filter((task) => task.importance === 'medium')),
    low: sortTasksForZone(open.filter((task) => task.importance === 'low')),
    completed,
  };
}

export function countOpenTasks(tasks: Task[]): number {
  return tasks.filter((task) => task.status === 'pending' || task.status === 'in_progress').length;
}
