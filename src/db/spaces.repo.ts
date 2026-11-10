import { db } from './db';
import type { Space } from './types';
import { newId, nowIso } from '../lib/id';

export interface CreateSpaceInput {
  name: string;
  color: string;
  icon: string;
}

export interface UpdateSpaceInput {
  name?: string;
  color?: string;
  icon?: string;
  archived?: boolean;
}

function normalizeName(name: string): string {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) throw new Error('Space name cannot be empty');
  return trimmed;
}

export async function listSpaces(): Promise<Space[]> {
  return db.spaces.orderBy('order').toArray();
}

export async function listActiveSpaces(): Promise<Space[]> {
  const spaces = await db.spaces.orderBy('order').toArray();
  return spaces.filter((space) => !space.archived);
}

export async function listArchivedSpaces(): Promise<Space[]> {
  const spaces = await db.spaces.orderBy('order').toArray();
  return spaces.filter((space) => space.archived);
}

export async function getSpace(id: string): Promise<Space | undefined> {
  return db.spaces.get(id);
}

export async function createSpace(input: CreateSpaceInput): Promise<Space> {
  const createdAt = nowIso();
  return db.transaction('rw', db.spaces, async () => {
    const all = await db.spaces.orderBy('order').toArray();
    const order = all.length > 0 ? (all[all.length - 1]?.order ?? 0) + 1 : 0;
    const space: Space = {
      id: newId(),
      name: normalizeName(input.name),
      color: input.color,
      icon: input.icon,
      order,
      archived: false,
      userId: null,
      metadata: {},
      createdAt,
      updatedAt: createdAt,
    };
    await db.spaces.add(space);
    return space;
  });
}

export async function updateSpace(id: string, patch: UpdateSpaceInput): Promise<Space> {
  return db.transaction('rw', db.spaces, async () => {
    const existing = await db.spaces.get(id);
    if (!existing) throw new Error('Space not found');
    const next: Space = {
      ...existing,
      ...(patch.name !== undefined ? { name: normalizeName(patch.name) } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
      ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
      updatedAt: nowIso(),
    };
    await db.spaces.put(next);
    return next;
  });
}

/** Spaces are soft-deleted in V1: archive, never remove. */
export async function archiveSpace(id: string): Promise<void> {
  await updateSpace(id, { archived: true });
}

export async function restoreSpace(id: string): Promise<void> {
  await updateSpace(id, { archived: false });
}

/** Swap order values with the adjacent space in the requested direction. */
export async function moveSpace(id: string, direction: 'up' | 'down'): Promise<void> {
  await db.transaction('rw', db.spaces, async () => {
    const all = await db.spaces.orderBy('order').toArray();
    // Reorder only among visible spaces; archived entries keep their order.
    const activeSpaces = all.filter((space) => !space.archived);
    const index = activeSpaces.findIndex((space) => space.id === id);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeSpaces.length) return;
    const current = activeSpaces[index];
    const target = activeSpaces[targetIndex];
    if (!current || !target) return;
    const currentOrder = current.order;
    const timestamp = nowIso();
    await db.spaces.update(current.id, { order: target.order, updatedAt: timestamp });
    await db.spaces.update(target.id, { order: currentOrder, updatedAt: timestamp });
  });
}
