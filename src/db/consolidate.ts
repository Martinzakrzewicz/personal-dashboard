import type { Block, Milestone, Space, Task } from './types';
import { normalizeBlockConfig } from '../features/blocks/definitions';

export interface ConsolidateInput {
  spaces: Space[];
  tasks: Task[];
  milestones: Milestone[];
  blocks: Block[];
}

export interface ConsolidateResult {
  data: ConsolidateInput;
  changed: boolean;
  spaceRemap: Record<string, string>;
}

function normalizeSpaceName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function newestFirst<T extends { id: string; updatedAt: string }>(records: T[]): T[] {
  return [...records].sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id),
  );
}

function isSeededLike(block: Block): boolean {
  // Default layouts occupy order 0-3; blocks added from the catalog get 4+.
  return block.order <= 3;
}

function stableConfig(config: Record<string, unknown>): string {
  const stable = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(record)
          .sort()
          .map((key) => [key, stable(record[key])]),
      );
    }
    return value;
  };
  return JSON.stringify(stable(config));
}

function noteText(block: Block): string {
  const config = normalizeBlockConfig(block.type, block.config).config;
  return typeof config.text === 'string' ? config.text : '';
}

function blockGroupKey(block: Block): string {
  if (block.type === 'tasks') return 'tasks';
  if (block.type === 'calendar') {
    return isSeededLike(block) ? 'calendar:seed' : `calendar:${block.id}`;
  }
  if (block.type === 'notes') {
    return `notes:${noteText(block)}`;
  }
  if (block.type === 'counter') {
    const config = normalizeBlockConfig(block.type, block.config).config;
    const label = typeof config.label === 'string' ? config.label.trim() : '';
    const targetDate = typeof config.targetDate === 'string' ? config.targetDate : '';
    if (label.toLowerCase() === 'next milestone' && isSeededLike(block)) {
      return 'counter:seed';
    }
    return `counter:${label}:${targetDate}`;
  }
  const config = normalizeBlockConfig(block.type, block.config).config;
  return `${block.type}:${stableConfig(config)}`;
}

function remapRecords<T extends { spaceId: string }>(
  records: T[],
  remap: Record<string, string>,
): T[] {
  return records.map((record) => {
    const target = remap[record.spaceId];
    return target ? { ...record, spaceId: target } : record;
  });
}

/**
 * Consolidates spaces that represent the same context but were created
 * independently on different devices (same normalized name, different UUID).
 *
 * - chooses the oldest space as canonical (deterministic on every device);
 * - takes display fields from the most recently updated duplicate;
 * - keeps the space active if at least one duplicate is active;
 * - remaps tasks, milestones and blocks to the canonical id;
 * - removes duplicated seeded widgets while preserving user-created content.
 */
export function consolidateData(input: ConsolidateInput): ConsolidateResult {
  const groups = new Map<string, Space[]>();
  for (const space of input.spaces) {
    const key = normalizeSpaceName(space.name);
    const list = groups.get(key) ?? [];
    list.push(space);
    groups.set(key, list);
  }

  const spaceRemap: Record<string, string> = {};
  const nextSpaces: Space[] = [];
  let mergedAny = false;

  for (const group of groups.values()) {
    if (group.length === 1) {
      nextSpaces.push(group[0] as Space);
      continue;
    }

    mergedAny = true;
    const oldestFirst = [...group].sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
    const canonical = oldestFirst[0] as Space;
    const latest = newestFirst(group)[0] as Space;
    const updatedAt = newestFirst(group)[0]?.updatedAt ?? canonical.updatedAt;

    nextSpaces.push({
      ...canonical,
      name: latest.name,
      color: latest.color,
      icon: latest.icon,
      order: Math.min(...group.map((space) => space.order)),
      archived: group.every((space) => space.archived),
      userId: latest.userId ?? canonical.userId,
      metadata: latest.metadata ?? canonical.metadata,
      updatedAt,
    });

    for (const space of group) {
      if (space.id !== canonical.id) spaceRemap[space.id] = canonical.id;
    }
  }

  const spaces = mergedAny
    ? nextSpaces
        .sort(
          (a, b) =>
            a.order - b.order ||
            a.createdAt.localeCompare(b.createdAt) ||
            a.id.localeCompare(b.id),
        )
        .map((space, index) => (space.order === index ? space : { ...space, order: index }))
    : nextSpaces;

  const tasks = remapRecords(input.tasks, spaceRemap);
  const milestones = remapRecords(input.milestones, spaceRemap);
  const remappedBlocks = remapRecords(input.blocks, spaceRemap);

  const affectedSpaces = new Set(Object.values(spaceRemap));
  const bySpace = new Map<string, Block[]>();
  for (const block of remappedBlocks) {
    const list = bySpace.get(block.spaceId) ?? [];
    list.push(block);
    bySpace.set(block.spaceId, list);
  }

  const nextBlocks: Block[] = [];
  let blocksChanged = false;

  for (const [spaceId, spaceBlocks] of bySpace) {
    const groupsByKey = new Map<string, Block[]>();
    for (const block of spaceBlocks) {
      const key = blockGroupKey(block);
      const list = groupsByKey.get(key) ?? [];
      list.push(block);
      groupsByKey.set(key, list);
    }

    const hasNonEmptyNote = spaceBlocks.some(
      (block) => block.type === 'notes' && noteText(block).trim().length > 0,
    );

    const keepers: Block[] = [];
    for (const [key, candidates] of groupsByKey) {
      // Empty notes add no information; drop them when a real note exists.
      if (key === 'notes:' && hasNonEmptyNote) {
        blocksChanged = true;
        continue;
      }
      const keeper = newestFirst(candidates)[0] as Block;
      keepers.push(keeper);
      if (candidates.length > 1) blocksChanged = true;
    }

    const spaceAffected = affectedSpaces.has(spaceId) || keepers.length !== spaceBlocks.length;
    if (spaceAffected) {
      const sorted = [...keepers].sort(
        (a, b) =>
          a.order - b.order ||
          a.createdAt.localeCompare(b.createdAt) ||
          a.id.localeCompare(b.id),
      );
      if (sorted.some((block, index) => block.order !== index)) blocksChanged = true;
      const ordered = sorted.map((block, index) =>
        block.order === index ? block : { ...block, order: index },
      );
      nextBlocks.push(...ordered);
    } else {
      nextBlocks.push(...spaceBlocks);
    }
  }

  return {
    data: { spaces, tasks, milestones, blocks: nextBlocks },
    changed: mergedAny || Object.keys(spaceRemap).length > 0 || blocksChanged,
    spaceRemap,
  };
}
