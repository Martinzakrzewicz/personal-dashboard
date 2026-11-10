import { db } from './db';
import type { Importance, Task, TaskStatus } from './types';
import { newId, nowIso } from '../lib/id';

export interface CreateTaskInput {
  title: string;
  importance?: Importance;
  status?: TaskStatus;
  dueDate?: string | null;
  notes?: string;
  milestoneId?: string | null;
  orderIndex?: number;
}

export interface UpdateTaskInput {
  title?: string;
  importance?: Importance;
  status?: TaskStatus;
  dueDate?: string | null;
  notes?: string;
  milestoneId?: string | null;
  orderIndex?: number;
  completedAt?: string | null;
}

export const MAX_TITLE_LENGTH = 200;

export function normalizeTaskTitle(title: string): string {
  return title.trim().slice(0, MAX_TITLE_LENGTH);
}

/** All task reads are scoped by spaceId by design. */
export async function listTasks(spaceId: string): Promise<Task[]> {
  return db.tasks.where('spaceId').equals(spaceId).toArray();
}

export async function getTask(spaceId: string, id: string): Promise<Task | undefined> {
  const task = await db.tasks.get(id);
  if (!task || task.spaceId !== spaceId) return undefined;
  return task;
}

export async function nextOrderIndex(spaceId: string): Promise<number> {
  const last = await db.tasks.where('spaceId').equals(spaceId).last();
  return last ? last.orderIndex + 1 : 0;
}

export async function createTask(
  spaceId: string,
  input: CreateTaskInput,
  idOverride?: string,
): Promise<Task> {
  const title = normalizeTaskTitle(input.title);
  if (!title) throw new Error('Task title cannot be empty');
  const createdAt = nowIso();
  const status = input.status ?? 'pending';
  const task: Task = {
    id: idOverride ?? newId(),
    spaceId,
    title,
    importance: input.importance ?? 'medium',
    status,
    dueDate: input.dueDate ?? null,
    notes: input.notes ?? '',
    orderIndex: input.orderIndex ?? (await nextOrderIndex(spaceId)),
    completedAt: status === 'done' ? createdAt : null,
    milestoneId: input.milestoneId ?? null,
    metadata: {},
    createdAt,
    updatedAt: createdAt,
  };
  await db.tasks.add(task);
  return task;
}

export async function updateTask(
  spaceId: string,
  id: string,
  patch: UpdateTaskInput,
): Promise<Task> {
  return db.transaction('rw', db.tasks, async () => {
    const existing = await db.tasks.get(id);
    if (!existing || existing.spaceId !== spaceId) throw new Error('Task not found in this space');
    const nextStatus = patch.status ?? existing.status;
    const nextTitle = patch.title !== undefined ? normalizeTaskTitle(patch.title) : existing.title;
    if (!nextTitle) throw new Error('Task title cannot be empty');

    const completedAt =
      patch.completedAt !== undefined
        ? patch.completedAt
        : nextStatus === 'done' && existing.status !== 'done'
          ? nowIso()
          : nextStatus !== 'done'
            ? null
            : existing.completedAt;

    const next: Task = {
      ...existing,
      ...patch,
      title: nextTitle,
      status: nextStatus,
      completedAt,
      updatedAt: nowIso(),
    };
    await db.tasks.put(next);
    return next;
  });
}

/** Deleting a task also clears milestone links that point at it. */
export async function deleteTask(spaceId: string, id: string): Promise<void> {
  await db.transaction('rw', db.tasks, db.milestones, async () => {
    const existing = await db.tasks.get(id);
    if (!existing || existing.spaceId !== spaceId) return;
    await db.tasks.delete(id);
    const timestamp = nowIso();
    await db.milestones
      .where('spaceId')
      .equals(spaceId)
      .and((milestone) => milestone.linkedTaskId === id)
      .modify({ linkedTaskId: null, updatedAt: timestamp });
  });
}

export async function deleteTaskBySpace(spaceId: string): Promise<void> {
  const ids = await db.tasks.where('spaceId').equals(spaceId).primaryKeys();
  await db.tasks.bulkDelete(ids);
}
