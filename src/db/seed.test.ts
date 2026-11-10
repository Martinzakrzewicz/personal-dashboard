import { describe, expect, it } from 'vitest';
import { seedIfEmpty } from './seed';
import { listSpaces } from './spaces.repo';
import { listBlocks } from './blocks.repo';
import { getMeta } from './meta.repo';

describe('first-launch seed', () => {
  it('creates the four default spaces, layouts and defaults exactly once', async () => {
    expect(await seedIfEmpty()).toBe(true);

    const spaces = await listSpaces();
    expect(spaces.map((space) => space.name)).toEqual([
      'University',
      'Sports',
      'Family & Friends',
      'Personal',
    ]);
    expect(spaces.map((space) => space.color)).toEqual([
      '#3B82F6',
      '#22C55E',
      '#F59E0B',
      '#A855F7',
    ]);
    expect(spaces.map((space) => space.icon)).toEqual([
      'graduation-cap',
      'dumbbell',
      'users',
      'user',
    ]);
    expect(spaces.every((space) => !space.archived && space.userId === null)).toBe(true);

    for (const space of spaces) {
      const blocks = await listBlocks(space.id);
      expect(blocks.map((block) => block.type)).toEqual(['tasks', 'calendar', 'notes', 'counter']);
      expect(blocks.every((block) => block.visible)).toBe(true);
      expect(blocks.every((block) => typeof block.config.version === 'number')).toBe(true);
    }

    expect(await getMeta('schemaVersion')).toBe(1);
    expect(await getMeta('language')).toBe('en');

    expect(await seedIfEmpty()).toBe(false);
    expect(await listSpaces()).toHaveLength(4);
  });
});
