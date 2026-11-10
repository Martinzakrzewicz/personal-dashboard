import { db } from './db';
import type { Milestone, MilestoneType } from './types';
import { newId, nowIso } from '../lib/id';

export interface CreateMilestoneInput {
  title: string;
  date: string;
  type: MilestoneType;
  linkedTaskId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateMilestoneInput {
  title?: string;
  date?: string;
  type?: MilestoneType;
  linkedTaskId?: string | null;
}

export async function listMilestones(spaceId: string): Promise<Milestone[]> {
  const milestones = await db.milestones.where('spaceId').equals(spaceId).toArray();
  return milestones.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getMilestone(
  spaceId: string,
  id: string,
): Promise<Milestone | undefined> {
  const milestone = await db.milestones.get(id);
  if (!milestone || milestone.spaceId !== spaceId) return undefined;
  return milestone;
}

export async function createMilestone(
  spaceId: string,
  input: CreateMilestoneInput,
): Promise<Milestone> {
  const title = input.title.trim().slice(0, 200);
  if (!title) throw new Error('Milestone title cannot be empty');
  const createdAt = nowIso();
  const milestone: Milestone = {
    id: newId(),
    spaceId,
    title,
    date: input.date,
    type: input.type,
    linkedTaskId: input.linkedTaskId ?? null,
    metadata: input.metadata ?? {},
    createdAt,
    updatedAt: createdAt,
  };
  await db.milestones.add(milestone);
  return milestone;
}

export async function updateMilestone(
  spaceId: string,
  id: string,
  patch: UpdateMilestoneInput,
): Promise<Milestone> {
  return db.transaction('rw', db.milestones, async () => {
    const existing = await db.milestones.get(id);
    if (!existing || existing.spaceId !== spaceId) {
      throw new Error('Milestone not found in this space');
    }
    const title = patch.title !== undefined ? patch.title.trim().slice(0, 200) : existing.title;
    if (!title) throw new Error('Milestone title cannot be empty');
    const next: Milestone = {
      ...existing,
      ...patch,
      title,
      updatedAt: nowIso(),
    };
    await db.milestones.put(next);
    return next;
  });
}

/** Deleting a milestone also clears task links that point at it. */
export async function deleteMilestone(spaceId: string, id: string): Promise<void> {
  await db.transaction('rw', db.milestones, db.tasks, async () => {
    const existing = await db.milestones.get(id);
    if (!existing || existing.spaceId !== spaceId) return;
    await db.milestones.delete(id);
    const timestamp = nowIso();
    await db.tasks
      .where('spaceId')
      .equals(spaceId)
      .and((task) => task.milestoneId === id)
      .modify({ milestoneId: null, updatedAt: timestamp });
  });
}
