import { describe, expect, it } from 'vitest';
import type { Importance, Task, TaskStatus } from '../../db/types';
import { groupTasksByZone, sortTasksForZone } from './ordering';

let counter = 0;

function makeTask(overrides: Partial<Task> & { title: string }): Task {
  counter += 1;
  const base: Omit<Task, 'title'> = {
    id: `task-${counter}`,
    spaceId: 'space-a',
    importance: 'medium',
    status: 'pending' as TaskStatus,
    dueDate: null,
    notes: '',
    orderIndex: counter,
    completedAt: null,
    milestoneId: null,
    metadata: {},
    createdAt: `2026-01-01T00:00:${String(counter).padStart(2, '0')}.000Z`,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  return { ...base, ...overrides };
}

describe('task ordering', () => {
  it('sorts due dates ascending with null dates last, then by orderIndex', () => {
    const tasks = [
      makeTask({ title: 'No date A', dueDate: null, orderIndex: 0 }),
      makeTask({ title: 'Later', dueDate: '2026-03-10', orderIndex: 5 }),
      makeTask({ title: 'Earlier B', dueDate: '2026-03-01', orderIndex: 3 }),
      makeTask({ title: 'Earlier A', dueDate: '2026-03-01', orderIndex: 1 }),
      makeTask({ title: 'No date B', dueDate: null, orderIndex: 1 }),
    ];

    expect(sortTasksForZone(tasks).map((task) => task.title)).toEqual([
      'Earlier A',
      'Earlier B',
      'Later',
      'No date A',
      'No date B',
    ]);
  });

  it('breaks equal due dates and equal orderIndex with creation time', () => {
    const first = makeTask({
      title: 'First',
      dueDate: '2026-04-01',
      orderIndex: 0,
      createdAt: '2026-01-01T00:00:01.000Z',
    });
    const second = makeTask({
      title: 'Second',
      dueDate: '2026-04-01',
      orderIndex: 0,
      createdAt: '2026-01-01T00:00:02.000Z',
    });

    expect(sortTasksForZone([second, first]).map((task) => task.title)).toEqual([
      'First',
      'Second',
    ]);
  });

  it('groups critical and high above medium above low, and hides completed in its own zone', () => {
    const importance: Importance[] = ['medium', 'critical', 'low', 'high'];
    const tasks = [
      ...importance.map((level) => makeTask({ title: level, importance: level })),
      makeTask({ title: 'finished', status: 'done', completedAt: '2026-01-02T00:00:00.000Z' }),
      makeTask({ title: 'dropped', status: 'cancelled' }),
    ];

    const zones = groupTasksByZone(tasks);
    expect(zones.top.map((task) => task.title)).toEqual(['critical', 'high']);
    expect(zones.middle.map((task) => task.title)).toEqual(['medium']);
    expect(zones.low.map((task) => task.title)).toEqual(['low']);
    expect(zones.completed.map((task) => task.title).sort()).toEqual(['dropped', 'finished']);
  });
});
