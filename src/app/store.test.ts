import { describe, expect, it } from 'vitest';
import { useAppStore } from './store';
import { createSpace, listSpaces } from '../db/spaces.repo';
import { createTask } from '../db/tasks.repo';
import { createMilestone } from '../db/milestones.repo';
import { getMeta } from '../db/meta.repo';

describe('app store space switching', () => {
  it('clears the previous space immediately and only loads the next space data', async () => {
    const spaceA = await createSpace({ name: 'A', color: '#3B82F6', icon: 'user' });
    const spaceB = await createSpace({ name: 'B', color: '#F59E0B', icon: 'users' });

    await createTask(spaceA.id, { title: 'Only in A' });
    await createTask(spaceB.id, { title: 'Only in B' });
    await createMilestone(spaceB.id, {
      title: 'B milestone',
      date: '2026-08-01',
      type: 'event',
    });

    const spaces = await listSpaces();
    useAppStore.setState({ spaces, initialized: true });

    await useAppStore.getState().switchSpace(spaceA.id);
    expect(useAppStore.getState().tasks.map((task) => task.title)).toEqual(['Only in A']);
    expect(useAppStore.getState().milestones).toHaveLength(0);

    const switching = useAppStore.getState().switchSpace(spaceB.id);
    // The synchronous part of the switch must wipe the old space's data.
    expect(useAppStore.getState().activeSpaceId).toBe(spaceB.id);
    expect(useAppStore.getState().tasks).toHaveLength(0);
    expect(useAppStore.getState().milestones).toHaveLength(0);
    expect(useAppStore.getState().blocks).toHaveLength(0);

    await switching;

    const state = useAppStore.getState();
    expect(state.tasks.map((task) => task.title)).toEqual(['Only in B']);
    expect(state.milestones.map((milestone) => milestone.title)).toEqual(['B milestone']);
    expect(state.loadingSpace).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--space-accent')).toBe('#F59E0B');
    expect(await getMeta('lastActiveSpaceId')).toBe(spaceB.id);
  });

  it('ignores archived spaces when switching', async () => {
    const spaceA = await createSpace({ name: 'A', color: '#3B82F6', icon: 'user' });
    const spaces = await listSpaces();
    spaces[0] = { ...spaces[0]!, archived: true };
    useAppStore.setState({ spaces, initialized: true });

    await useAppStore.getState().switchSpace(spaceA.id);

    expect(useAppStore.getState().activeSpaceId).toBeNull();
    expect(useAppStore.getState().tasks).toHaveLength(0);
  });
});
