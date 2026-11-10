import { describe, expect, it } from 'vitest';
import { db } from './db';
import {
  BACKUP_FORMAT,
  BackupValidationError,
  exportBackup,
  importBackup,
  parseBackupJson,
} from './backup';
import { createSpace } from './spaces.repo';
import { createTask, listTasks } from './tasks.repo';
import { createMilestone } from './milestones.repo';
import { createBlock } from './blocks.repo';
import { setMeta } from './meta.repo';
import type { BackupFile } from './types';

function sortedData(backup: BackupFile) {
  return {
    spaces: [...backup.data.spaces].sort((a, b) => a.id.localeCompare(b.id)),
    tasks: [...backup.data.tasks].sort((a, b) => a.id.localeCompare(b.id)),
    milestones: [...backup.data.milestones].sort((a, b) => a.id.localeCompare(b.id)),
    blocks: [...backup.data.blocks].sort((a, b) => a.id.localeCompare(b.id)),
    meta: [...backup.data.meta].sort((a, b) => a.key.localeCompare(b.key)),
  };
}

describe('backup export / import', () => {
  it('restores identical data after an export/import round trip', async () => {
    const space = await createSpace({ name: 'University', color: '#3B82F6', icon: 'graduation-cap' });
    const task = await createTask(space.id, {
      title: 'Study for finals',
      importance: 'critical',
      dueDate: '2026-05-20',
      notes: 'Chapter 4',
    });
    await createMilestone(space.id, {
      title: 'Final exam',
      date: '2026-05-21',
      type: 'exam',
      linkedTaskId: task.id,
    });
    await createBlock({
      spaceId: space.id,
      type: 'notes',
      position: { column: 0, row: 0, width: 6, height: 4 },
      visible: true,
      config: { version: 2, text: 'Remember this' },
      order: 0,
    });
    await setMeta('language', 'es');

    const before = await exportBackup();
    expect(before.format).toBe(BACKUP_FORMAT);
    expect(before.version).toBe(1);

    await createTask(space.id, { title: 'Extra task created after export' });
    await importBackup(before);

    const after = await exportBackup();
    expect(sortedData(after)).toEqual(sortedData(before));
    expect(after.exportedAt).not.toBe('');
    expect((await listTasks(space.id)).map((entry) => entry.title)).toEqual([
      'Study for finals',
    ]);
  });

  it('rejects files with an unknown format', () => {
    expect(() => parseBackupJson(JSON.stringify({ format: 'something-else', version: 1 }))).toThrow(
      BackupValidationError,
    );
    expect(() => parseBackupJson('not json')).toThrow(BackupValidationError);
  });

  it('accepts a valid exported payload through parseBackupJson', async () => {
    const space = await createSpace({ name: 'Sports', color: '#22C55E', icon: 'dumbbell' });
    await createTask(space.id, { title: 'Training' });

    const json = JSON.stringify(await exportBackup());
    const parsed = parseBackupJson(json);

    expect(parsed.data.spaces).toHaveLength(1);
    expect(parsed.data.tasks).toHaveLength(1);

    await db.tasks.clear();
    expect(await db.tasks.count()).toBe(0);
  });
});
