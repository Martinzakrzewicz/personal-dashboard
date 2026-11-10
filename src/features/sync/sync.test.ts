import { describe, expect, it } from 'vitest';
import type { BackupFile } from '../../db/types';
import { createSyncPayload, mergeSyncPayloads, payloadDataEqual } from './merge';
import { createSyncCode, decryptJson, encryptJson, generateSyncKey, parseSyncCode } from './crypto';

function backupWith(tasks: BackupFile['data']['tasks']): BackupFile {
  return {
    format: 'personal-dashboard-backup',
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    data: {
      spaces: [],
      tasks,
      milestones: [],
      blocks: [],
      meta: [
        { key: 'schemaVersion', value: 1 },
        { key: 'language', value: 'en' },
      ],
    },
  };
}

function task(id: string, title: string, updatedAt: string) {
  return {
    id,
    spaceId: 'space-1',
    title,
    importance: 'medium' as const,
    status: 'pending' as const,
    dueDate: null,
    notes: '',
    orderIndex: 0,
    completedAt: null,
    milestoneId: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
  };
}

describe('sync merge', () => {
  it('keeps the newest record per id and filters tombstoned records', () => {
    const local = createSyncPayload(
      backupWith([task('a', 'old A', '2026-01-01T00:00:00.000Z'), task('b', 'local B', '2026-01-02T00:00:00.000Z')]),
      'device-local',
    );
    local.tombstones.tasks.b = '2026-01-03T00:00:00.000Z';

    const remote = createSyncPayload(
      backupWith([task('a', 'new A', '2026-01-05T00:00:00.000Z'), task('c', 'remote C', '2026-01-02T00:00:00.000Z')]),
      'device-remote',
    );
    remote.tombstones.tasks.c = '2026-01-04T00:00:00.000Z';

    const merged = mergeSyncPayloads(local, remote);
    const titles = merged.backup.data.tasks.map((entry) => entry.title);
    expect(titles).toEqual(['new A']);
    expect(merged.tombstones.tasks.b).toBe('2026-01-03T00:00:00.000Z');
    expect(merged.tombstones.tasks.c).toBe('2026-01-04T00:00:00.000Z');
    expect(merged.backup.data.meta.find((entry) => entry.key === 'language')?.value).toBe('en');
  });

  it('recognizes equal payload data regardless of record order', () => {
    const first = createSyncPayload(
      backupWith([task('a', 'A', '2026-01-01T00:00:00.000Z'), task('b', 'B', '2026-01-02T00:00:00.000Z')]),
      'one',
    );
    const second = createSyncPayload(
      backupWith([task('b', 'B', '2026-01-02T00:00:00.000Z'), task('a', 'A', '2026-01-01T00:00:00.000Z')]),
      'two',
    );
    expect(payloadDataEqual(first, second)).toBe(true);
  });
});

describe('sync encryption', () => {
  it('round-trips an encrypted payload and parses the sync code', async () => {
    const key = generateSyncKey();
    const payload = { hello: 'world', nested: { count: 3 } };
    const encrypted = await encryptJson(key, payload);
    expect(encrypted).not.toContain('world');
    expect(await decryptJson(key, encrypted)).toEqual(payload);
  });

  it('creates and parses a sync code', () => {
    const key = generateSyncKey();
    const code = createSyncCode('abc123', key);
    expect(parseSyncCode(code)).toEqual({ gistId: 'abc123', key });
    expect(parseSyncCode('invalid')).toBeNull();
  });
});
