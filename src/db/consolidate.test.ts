import { describe, expect, it } from 'vitest';
import type { Block, Milestone, Space, Task } from './types';
import { consolidateData } from './consolidate';
import { db } from './db';
import { consolidateDuplicateSpaces } from './consolidate.repo';
import { createSpace, listActiveSpaces } from './spaces.repo';
import { createTask, listTasks } from './tasks.repo';
import { getMeta, setMeta } from './meta.repo';

function space(id: string, name: string, order: number, extras: Partial<Space> = {}): Space {
  return {
    id,
    name,
    color: '#3B82F6',
    icon: 'graduation-cap',
    order,
    archived: false,
    userId: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extras,
  };
}

function task(id: string, spaceId: string, title: string): Task {
  return {
    id,
    spaceId,
    title,
    importance: 'medium',
    status: 'pending',
    dueDate: null,
    notes: '',
    orderIndex: 0,
    completedAt: null,
    milestoneId: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function milestone(id: string, spaceId: string, title: string): Milestone {
  return {
    id,
    spaceId,
    title,
    date: '2026-06-01',
    type: 'event',
    linkedTaskId: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function block(
  id: string,
  spaceId: string,
  type: string,
  order: number,
  config: Block['config'],
): Block {
  return {
    id,
    spaceId,
    type,
    position: { column: 0, row: 0, width: 6, height: 4 },
    visible: true,
    config,
    order,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function defaultBlocks(prefix: string, spaceId: string, note: string): Block[] {
  return [
    block(`${prefix}-tasks`, spaceId, 'tasks', 0, { version: 1, showCompleted: true }),
    block(`${prefix}-calendar`, spaceId, 'calendar', 1, { version: 2, days: 7 }),
    block(`${prefix}-notes`, spaceId, 'notes', 2, { version: 2, text: note }),
    block(`${prefix}-counter`, spaceId, 'counter', 3, {
      version: 1,
      label: 'Next milestone',
      targetDate: '2026-12-01',
    }),
  ];
}

describe('space consolidation', () => {
  it('merges same-name spaces and remaps all of their content', () => {
    const spaces = [
      space('space-a', 'University', 0),
      space('space-b', 'university ', 1, { color: '#22C55E' }),
    ];
    const tasks = [task('task-a', 'space-a', 'Essay'), task('task-b', 'space-b', 'Lab')];
    const milestones = [
      milestone('milestone-a', 'space-a', 'Exam'),
      milestone('milestone-b', 'space-b', 'Delivery'),
    ];
    const blocks = [
      ...defaultBlocks('a', 'space-a', 'Note A'),
      ...defaultBlocks('b', 'space-b', 'Note B'),
      // A user-added calendar (order 4) must survive.
      block('a-extra-calendar', 'space-a', 'calendar', 4, { version: 2, days: 7 }),
    ];

    const result = consolidateData({ spaces, tasks, milestones, blocks });

    expect(result.changed).toBe(true);
    expect(result.spaceRemap).toEqual({ 'space-b': 'space-a' });
    expect(result.data.spaces).toHaveLength(1);
    const merged = result.data.spaces[0]!;
    expect(merged.id).toBe('space-a');
    expect(merged.color).toBe('#22C55E');
    expect(merged.order).toBe(0);

    expect(result.data.tasks.map((entry) => entry.spaceId)).toEqual(['space-a', 'space-a']);
    expect(result.data.tasks.map((entry) => entry.title).sort()).toEqual(['Essay', 'Lab']);
    expect(result.data.milestones.map((entry) => entry.spaceId)).toEqual([
      'space-a',
      'space-a',
    ]);

    const types = result.data.blocks.map((entry) => entry.type);
    expect(types.filter((type) => type === 'tasks')).toHaveLength(1);
    expect(types.filter((type) => type === 'calendar')).toHaveLength(2);
    expect(types.filter((type) => type === 'notes')).toHaveLength(2);
    expect(types.filter((type) => type === 'counter')).toHaveLength(1);
    expect(result.data.blocks.every((entry) => entry.spaceId === 'space-a')).toBe(true);
    expect(result.data.blocks.map((entry) => entry.order)).toEqual([0, 1, 2, 3, 4, 5]);

    const again = consolidateData(result.data);
    expect(again.changed).toBe(false);
  });

  it('keeps the merged space active when at least one duplicate is active', () => {
    const result = consolidateData({
      spaces: [
        space('space-a', 'Sports', 0, { archived: true, updatedAt: '2026-02-01T00:00:00.000Z' }),
        space('space-b', 'Sports', 1, { archived: false }),
      ],
      tasks: [],
      milestones: [],
      blocks: [],
    });
    expect(result.data.spaces[0]?.archived).toBe(false);
  });

  it('does not remove a user-added second calendar in a single space', () => {
    const input = {
      spaces: [space('space-a', 'Personal', 0)],
      tasks: [],
      milestones: [],
      blocks: [
        block('tasks', 'space-a', 'tasks', 0, { version: 1, showCompleted: true }),
        block('calendar-a', 'space-a', 'calendar', 1, { version: 2, days: 7 }),
        block('calendar-b', 'space-a', 'calendar', 4, { version: 2, days: 7 }),
      ],
    };
    const result = consolidateData(input);
    expect(result.data.blocks).toHaveLength(3);
    expect(result.changed).toBe(false);
  });

  it('consolidates duplicates already stored in IndexedDB and updates lastActiveSpaceId', async () => {
    const a = await createSpace({ name: 'University', color: '#3B82F6', icon: 'graduation-cap' });
    const b = await createSpace({ name: 'University', color: '#3B82F6', icon: 'graduation-cap' });
    await createTask(a.id, { title: 'A task' });
    await createTask(b.id, { title: 'B task' });
    await setMeta('lastActiveSpaceId', b.id);

    const changed = await consolidateDuplicateSpaces();

    expect(changed).toBe(true);
    const spaces = await listActiveSpaces();
    expect(spaces).toHaveLength(1);
    expect((await listTasks(spaces[0]!.id)).map((entry) => entry.title).sort()).toEqual([
      'A task',
      'B task',
    ]);
    expect(await getMeta('lastActiveSpaceId')).toBe(a.id);
    expect(await db.spaces.count()).toBe(1);
  });
});
