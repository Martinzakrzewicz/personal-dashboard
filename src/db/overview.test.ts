import { describe, expect, it } from 'vitest';
import { loadOverview } from './overview.repo';
import { createSpace, archiveSpace } from './spaces.repo';
import { createTask } from './tasks.repo';
import { createMilestone } from './milestones.repo';
import { createBlock } from './blocks.repo';

describe('cross-space overview', () => {
  it('aggregates scoped reads per space without leaking records', async () => {
    const spaceA = await createSpace({ name: 'A', color: '#3B82F6', icon: 'user' });
    const spaceB = await createSpace({ name: 'B', color: '#22C55E', icon: 'users' });
    await createTask(spaceA.id, { title: 'Task A' });
    await createTask(spaceB.id, { title: 'Task B' });
    await createMilestone(spaceA.id, { title: 'Milestone A', date: '2026-06-01', type: 'event' });
    await createMilestone(spaceB.id, { title: 'Milestone B', date: '2026-06-02', type: 'exam' });
    await createBlock({
      spaceId: spaceA.id,
      type: 'notes',
      position: { column: 0, row: 0, width: 6, height: 4 },
      visible: true,
      config: { version: 2, text: 'Note A' },
      order: 0,
    });

    const overview = await loadOverview();
    expect(overview.spaces).toHaveLength(2);
    const a = overview.spaces.find((entry) => entry.space.id === spaceA.id);
    const b = overview.spaces.find((entry) => entry.space.id === spaceB.id);

    expect(a?.tasks.map((task) => task.title)).toEqual(['Task A']);
    expect(b?.tasks.map((task) => task.title)).toEqual(['Task B']);
    expect(a?.milestones.map((milestone) => milestone.title)).toEqual(['Milestone A']);
    expect(b?.milestones.map((milestone) => milestone.title)).toEqual(['Milestone B']);
    expect(a?.blocks.map((block) => block.type)).toEqual(['notes']);
    expect(b?.blocks).toHaveLength(0);

    await archiveSpace(spaceB.id);
    const afterArchive = await loadOverview();
    expect(afterArchive.spaces.map((entry) => entry.space.id)).toEqual([spaceA.id]);
  });
});
