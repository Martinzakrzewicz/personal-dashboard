import { db } from './db';
import type { Block, Space } from './types';
import { newId, nowIso } from '../lib/id';
import { BLOCK_DEFINITIONS } from '../features/blocks/definitions';

export const SEED_SPACES = [
  { name: 'University', color: '#3B82F6', icon: 'graduation-cap' },
  { name: 'Sports', color: '#22C55E', icon: 'dumbbell' },
  { name: 'Family & Friends', color: '#F59E0B', icon: 'users' },
  { name: 'Personal', color: '#A855F7', icon: 'user' },
] as const;

interface SeedBlockSpec {
  type: string;
  width: number;
  column: number;
}

const SEED_LAYOUT: SeedBlockSpec[] = [
  { type: 'tasks', width: 8, column: 0 },
  { type: 'calendar', width: 4, column: 8 },
  { type: 'notes', width: 6, column: 0 },
  { type: 'counter', width: 6, column: 6 },
];

function seedBlock(spaceId: string, spec: SeedBlockSpec, order: number): Block {
  const definition = BLOCK_DEFINITIONS.find((entry) => entry.type === spec.type);
  const timestamp = nowIso();
  return {
    id: newId(),
    spaceId,
    type: spec.type,
    position: {
      column: spec.column,
      row: Math.floor(order / 2),
      width: spec.width,
      height: 4,
    },
    visible: true,
    config: definition ? { ...definition.defaultConfig } : { version: 1 },
    order,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** The four-block starter layout used by seed data and newly created spaces. */
export function buildDefaultBlocks(spaceId: string): Block[] {
  return SEED_LAYOUT.map((spec, index) => seedBlock(spaceId, spec, index));
}

export async function createDefaultBlocksForSpace(spaceId: string): Promise<Block[]> {
  const blocks = buildDefaultBlocks(spaceId);
  await db.blocks.bulkAdd(blocks);
  return blocks;
}

/**
 * Seeds four spaces and their default block layout on first launch only.
 * Returns true when seeding actually happened.
 */
export async function seedIfEmpty(): Promise<boolean> {
  return db.transaction('rw', db.spaces, db.blocks, db.meta, async () => {
    const existing = await db.spaces.count();
    if (existing > 0) return false;

    const timestamp = nowIso();
    const spaces: Space[] = SEED_SPACES.map((seed, index) => ({
      id: newId(),
      name: seed.name,
      color: seed.color,
      icon: seed.icon,
      order: index,
      archived: false,
      userId: null,
      metadata: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    const blocks = spaces.flatMap((space) => buildDefaultBlocks(space.id));

    await db.spaces.bulkAdd(spaces);
    await db.blocks.bulkAdd(blocks);
    await db.meta.bulkPut([
      { key: 'schemaVersion', value: 1 },
      { key: 'language', value: 'en' },
      { key: 'theme', value: 'system' },
      { key: 'lastActiveSpaceId', value: spaces[0]?.id ?? null },
    ]);
    return true;
  });
}
