import { db } from './db';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupFileSchema,
  type BackupFile,
} from './types';
import { nowIso } from '../lib/id';

export { BACKUP_FORMAT, BACKUP_VERSION };
export type { BackupFile };

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

/** Export every table to a single, versioned JSON object. */
export async function exportBackup(): Promise<BackupFile> {
  const [spaces, tasks, milestones, blocks, meta] = await Promise.all([
    db.spaces.toArray(),
    db.tasks.toArray(),
    db.milestones.toArray(),
    db.blocks.toArray(),
    db.meta.toArray(),
  ]);

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: nowIso(),
    data: { spaces, tasks, milestones, blocks, meta },
  };
}

export async function exportBackupJson(): Promise<string> {
  return JSON.stringify(await exportBackup(), null, 2);
}

export function parseBackupJson(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupValidationError('Backup file is not valid JSON');
  }

  if (
    typeof raw !== 'object' ||
    raw === null ||
    (raw as { format?: unknown }).format !== BACKUP_FORMAT
  ) {
    throw new BackupValidationError('Unknown backup format');
  }

  const parsed = backupFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new BackupValidationError('Backup file failed validation');
  }
  return parsed.data;
}

/**
 * Replaces all local data with the backup's contents in a single transaction.
 * The caller must confirm with the user first.
 */
export async function importBackup(backup: BackupFile): Promise<void> {
  const parsed = backupFileSchema.safeParse(backup);
  if (!parsed.success) throw new BackupValidationError('Backup file failed validation');

  await db.transaction(
    'rw',
    db.spaces,
    db.tasks,
    db.milestones,
    db.blocks,
    db.meta,
    async () => {
      await Promise.all([
        db.spaces.clear(),
        db.tasks.clear(),
        db.milestones.clear(),
        db.blocks.clear(),
        db.meta.clear(),
      ]);
      const { spaces, tasks, milestones, blocks, meta } = parsed.data.data;
      await db.spaces.bulkAdd(spaces);
      await db.tasks.bulkAdd(tasks);
      await db.milestones.bulkAdd(milestones);
      await db.blocks.bulkAdd(blocks);
      // Preserve the backup's meta table exactly so a round trip is byte-for-byte
      // equivalent at the data level (schemaVersion is written when seeding).
      await db.meta.bulkPut(meta);
    },
  );
}
