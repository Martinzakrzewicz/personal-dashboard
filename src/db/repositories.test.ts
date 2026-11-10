import { describe, expect, it } from 'vitest';
import { db } from './db';
import {
  archiveSpace,
  createSpace,
  listActiveSpaces,
} from './spaces.repo';
import { createTask, deleteTask, getTask, listTasks, updateTask } from './tasks.repo';
import { createMilestone, listMilestones } from './milestones.repo';
import { createBlock, listBlocks, updateBlock } from './blocks.repo';

describe('space-scoped repositories', () => {
  it('never returns tasks from another space, including after archiving', async () => {
    const spaceA = await createSpace({ name: 'Space A', color: '#3B82F6', icon: 'user' });
    const spaceB = await createSpace({ name: 'Space B', color: '#22C55E', icon: 'users' });

    const a1 = await createTask(spaceA.id, { title: 'A one' });
    const a2 = await createTask(spaceA.id, { title: 'A two' });
    const b1 = await createTask(spaceB.id, { title: 'B one' });

    const tasksA = await listTasks(spaceA.id);
    expect(tasksA.map((task) => task.id).sort()).toEqual([a1.id, a2.id].sort());
    expect(tasksA.some((task) => task.id === b1.id)).toBe(false);

    const tasksB = await listTasks(spaceB.id);
    expect(tasksB.map((task) => task.id)).toEqual([b1.id]);

    await archiveSpace(spaceA.id);
    const afterArchive = await listTasks(spaceA.id);
    expect(afterArchive.map((task) => task.id).sort()).toEqual([a1.id, a2.id].sort());
    expect(afterArchive.some((task) => task.id === b1.id)).toBe(false);
    expect((await listTasks(spaceB.id)).map((task) => task.id)).toEqual([b1.id]);

    const active = await listActiveSpaces();
    expect(active.map((space) => space.id)).toEqual([spaceB.id]);
  });

  it('refuses cross-space reads and updates', async () => {
    const spaceA = await createSpace({ name: 'A', color: '#3B82F6', icon: 'user' });
    const spaceB = await createSpace({ name: 'B', color: '#22C55E', icon: 'users' });
    const taskB = await createTask(spaceB.id, { title: 'Private to B' });

    expect(await getTask(spaceA.id, taskB.id)).toBeUndefined();
    await expect(updateTask(spaceA.id, taskB.id, { title: 'Hacked' })).rejects.toThrow();

    const stillB = await getTask(spaceB.id, taskB.id);
    expect(stillB?.title).toBe('Private to B');
  });

  it('clears milestone links when a task is deleted', async () => {
    const space = await createSpace({ name: 'Links', color: '#3B82F6', icon: 'user' });
    const task = await createTask(space.id, { title: 'Deliver project' });
    const milestone = await createMilestone(space.id, {
      title: 'Delivery day',
      date: '2026-06-01',
      type: 'delivery',
      linkedTaskId: task.id,
    });

    await deleteTask(space.id, task.id);

    const milestones = await listMilestones(space.id);
    expect(milestones.find((entry) => entry.id === milestone.id)?.linkedTaskId).toBeNull();
  });

  it('scopes milestones and blocks to the active space and persists block layouts', async () => {
    const spaceA = await createSpace({ name: 'A', color: '#3B82F6', icon: 'user' });
    const spaceB = await createSpace({ name: 'B', color: '#22C55E', icon: 'users' });

    await createMilestone(spaceA.id, { title: 'A milestone', date: '2026-01-01', type: 'event' });
    const block = await createBlock({
      spaceId: spaceA.id,
      type: 'notes',
      position: { column: 0, row: 0, width: 6, height: 4 },
      visible: true,
      config: { version: 2, text: 'first' },
      order: 0,
    });
    await updateBlock(spaceA.id, block.id, {
      position: { ...block.position, width: 12 },
      config: { version: 2, text: 'saved layout' },
    });

    expect(await listMilestones(spaceB.id)).toHaveLength(0);
    expect(await listBlocks(spaceB.id)).toHaveLength(0);

    const blocks = await listBlocks(spaceA.id);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.position.width).toBe(12);
    expect(blocks[0]?.config.text).toBe('saved layout');
  });

  it('keeps a saved layout identical after a database reload', async () => {
    const space = await createSpace({ name: 'Reload', color: '#3B82F6', icon: 'user' });
    const first = await createBlock({
      spaceId: space.id,
      type: 'counter',
      position: { column: 0, row: 0, width: 3, height: 4 },
      visible: true,
      config: { version: 1, label: 'Launch', targetDate: '2026-12-01' },
      order: 0,
    });
    const second = await createBlock({
      spaceId: space.id,
      type: 'notes',
      position: { column: 3, row: 0, width: 9, height: 4 },
      visible: true,
      config: { version: 2, text: 'Persisted note' },
      order: 1,
    });
    await updateBlock(space.id, second.id, { order: 0 });
    await updateBlock(space.id, first.id, { order: 1 });

    const beforeReload = await listBlocks(space.id);
    db.close();
    await db.open();
    const afterReload = await listBlocks(space.id);

    expect(afterReload).toEqual(beforeReload);
    expect(afterReload.map((block) => block.type)).toEqual(['notes', 'counter']);
  });
});
