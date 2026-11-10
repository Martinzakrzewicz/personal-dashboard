export type DeletableTable = 'tasks' | 'milestones' | 'blocks';

export type DeletionLog = Record<DeletableTable, Record<string, string>>;

const STORAGE_KEY = 'pd.deletion-log.v1';

function emptyLog(): DeletionLog {
  return { tasks: {}, milestones: {}, blocks: {} };
}

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getDeletionLog(): DeletionLog {
  const storage = getStorage();
  if (!storage) return emptyLog();
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null') as Partial<DeletionLog> | null;
    if (!parsed) return emptyLog();
    return {
      tasks: parsed.tasks ?? {},
      milestones: parsed.milestones ?? {},
      blocks: parsed.blocks ?? {},
    };
  } catch {
    return emptyLog();
  }
}

export function setDeletionLog(log: DeletionLog): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Quota or private-mode failures should never break data operations.
  }
}

export function recordDeletion(table: DeletableTable, id: string, deletedAt = new Date().toISOString()): void {
  const log = getDeletionLog();
  log[table][id] = deletedAt;
  setDeletionLog(log);
}

export function clearDeletionLog(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/** Merges two logs, keeping the most recent deletion timestamp per id. */
export function mergeDeletionLogs(a: DeletionLog, b: DeletionLog): DeletionLog {
  const merged = emptyLog();
  for (const table of ['tasks', 'milestones', 'blocks'] as const) {
    for (const [id, timestamp] of Object.entries(a[table])) {
      merged[table][id] = timestamp;
    }
    for (const [id, timestamp] of Object.entries(b[table])) {
      const existing = merged[table][id];
      if (!existing || timestamp > existing) merged[table][id] = timestamp;
    }
  }
  return merged;
}

export function deletionLogsEqual(a: DeletionLog, b: DeletionLog): boolean {
  for (const table of ['tasks', 'milestones', 'blocks'] as const) {
    const aKeys = Object.keys(a[table]).sort();
    const bKeys = Object.keys(b[table]).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (a[table][key] !== b[table][key]) return false;
    }
  }
  return true;
}
