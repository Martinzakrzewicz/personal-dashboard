import { z } from 'zod';
import {
  backupFileSchema,
  type BackupFile,
  type Block,
  type Milestone,
  type Space,
  type Task,
} from '../../db/types';
import {
  deletionLogsEqual,
  getDeletionLog,
  mergeDeletionLogs,
  type DeletionLog,
} from '../../lib/deletion-log';
import { consolidateData } from '../../db/consolidate';
import { nowIso } from '../../lib/id';

export const SYNC_FORMAT = 'personal-dashboard-sync';
export const SYNC_VERSION = 1;

export const syncPayloadSchema = z.object({
  format: z.literal(SYNC_FORMAT),
  version: z.literal(SYNC_VERSION),
  deviceId: z.string().min(1),
  updatedAt: z.string().min(1),
  backup: backupFileSchema,
  tombstones: z.object({
    tasks: z.record(z.string(), z.string()),
    milestones: z.record(z.string(), z.string()),
    blocks: z.record(z.string(), z.string()),
  }),
});

export type SyncPayload = z.infer<typeof syncPayloadSchema>;

function sortById<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, stableValue(record[key])]),
    );
  }
  return value;
}

export function canonicalBackupData(backup: BackupFile): string {
  return JSON.stringify(
    stableValue({
      spaces: sortById(backup.data.spaces),
      tasks: sortById(backup.data.tasks),
      milestones: sortById(backup.data.milestones),
      blocks: sortById(backup.data.blocks),
      meta: [...backup.data.meta].sort((a, b) => a.key.localeCompare(b.key)),
    }),
  );
}

export function backupDataEqual(a: BackupFile, b: BackupFile): boolean {
  return canonicalBackupData(a) === canonicalBackupData(b);
}

function isDeleted(tombstone: Record<string, string>, id: string, updatedAt: string): boolean {
  const deletedAt = tombstone[id];
  return Boolean(deletedAt && deletedAt >= updatedAt);
}

function mergeTable<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[],
  tombstones: Record<string, string>,
): T[] {
  const merged = new Map<string, T>();
  for (const record of [...local, ...remote]) {
    const existing = merged.get(record.id);
    if (!existing || record.updatedAt > existing.updatedAt) {
      merged.set(record.id, record);
    }
  }
  return sortById(
    [...merged.values()].filter((record) => !isDeleted(tombstones, record.id, record.updatedAt)),
  );
}

export function mergeSyncPayloads(local: SyncPayload, remote: SyncPayload): SyncPayload {
  const tombstones = mergeDeletionLogs(local.tombstones, remote.tombstones);
  const meta = local.backup.data.meta.filter((record) => record.key !== 'schemaVersion');
  meta.push({ key: 'schemaVersion', value: 1 });

  const merged = consolidateData({
    spaces: mergeTable<Space>(local.backup.data.spaces, remote.backup.data.spaces, {}),
    tasks: mergeTable<Task>(local.backup.data.tasks, remote.backup.data.tasks, tombstones.tasks),
    milestones: mergeTable<Milestone>(
      local.backup.data.milestones,
      remote.backup.data.milestones,
      tombstones.milestones,
    ),
    blocks: mergeTable<Block>(local.backup.data.blocks, remote.backup.data.blocks, tombstones.blocks),
  });

  const backup: BackupFile = {
    format: local.backup.format,
    version: local.backup.version,
    exportedAt: nowIso(),
    data: {
      ...merged.data,
      meta,
    },
  };

  return {
    format: SYNC_FORMAT,
    version: SYNC_VERSION,
    deviceId: local.deviceId,
    updatedAt: nowIso(),
    backup,
    tombstones,
  };
}

export function createSyncPayload(backup: BackupFile, deviceId: string): SyncPayload {
  return {
    format: SYNC_FORMAT,
    version: SYNC_VERSION,
    deviceId,
    updatedAt: nowIso(),
    backup,
    tombstones: getDeletionLog(),
  };
}

export function payloadDataEqual(a: SyncPayload, b: SyncPayload): boolean {
  return backupDataEqual(a.backup, b.backup) && deletionLogsEqual(a.tombstones, b.tombstones);
}

export type { DeletionLog };
