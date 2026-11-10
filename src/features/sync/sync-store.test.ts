import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/db';
import { createSpace } from '../../db/spaces.repo';
import { createTask, deleteTask, listTasks } from '../../db/tasks.repo';
import { useAppStore } from '../../app/store';
import { useSyncStore } from './store';
import { readGist } from './gist';

const GIST_ID = 'gist-test-1';
let gistContent = '';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  gistContent = '';
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/user')) return json({ login: 'tester' });
    if (url.endsWith('/gists') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as {
        files: Record<string, { content: string }>;
      };
      gistContent = body.files['dashboard.sync.json']?.content ?? '';
      return json({ id: GIST_ID, files: body.files }, 201);
    }
    if (url.endsWith(`/gists/${GIST_ID}`) && init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as {
        files: Record<string, { content: string }>;
      };
      gistContent = body.files['dashboard.sync.json']?.content ?? '';
      return json({ id: GIST_ID, files: body.files });
    }
    if (url.endsWith(`/gists/${GIST_ID}`)) {
      return json({
        id: GIST_ID,
        files: { 'dashboard.sync.json': { content: gistContent } },
      });
    }
    return json({ message: 'Not Found' }, 404);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSyncStore.setState({ config: null, lastSyncedAt: null, status: 'idle', error: null });
});

describe('sync orchestration', () => {
  it('creates a sync and merges data from a second device', async () => {
    const space = await createSpace({ name: 'Synced', color: '#3B82F6', icon: 'user' });
    await createTask(space.id, { title: 'From the Mac' });

    const code = await useSyncStore.getState().createSync('test-token');
    const firstConfig = useSyncStore.getState().config;
    expect(code.startsWith('pds1.')).toBe(true);
    expect(firstConfig).not.toBeNull();
    expect(useSyncStore.getState().status).toBe('synced');

    // Simulate a second device with its own local record and a fresh database.
    await db.delete();
    await db.open();
    window.localStorage.clear();
    useSyncStore.setState({ config: null, lastSyncedAt: null, status: 'idle', error: null });
    useAppStore.setState({ spaces: [], activeSpaceId: null, tasks: [], milestones: [], blocks: [] });
    await createTask(space.id, { title: 'From the phone' });

    await useSyncStore.getState().joinSync('test-token', code);
    const synced = await listTasks(space.id);
    expect(synced.map((task) => task.title).sort()).toEqual(['From the Mac', 'From the phone']);

    const config = useSyncStore.getState().config;
    expect(config?.gistId).toBe(GIST_ID);
    const remote = await readGist('test-token', GIST_ID, config!.key);
    expect(remote.backup.data.tasks.map((task) => task.title).sort()).toEqual([
      'From the Mac',
      'From the phone',
    ]);

    // A deletion on the second device must not resurrect on the next pull.
    const macTask = synced.find((task) => task.title === 'From the Mac');
    expect(macTask).toBeTruthy();
    await deleteTask(space.id, macTask!.id);
    await useSyncStore.getState().syncNow();

    const afterDelete = await readGist('test-token', GIST_ID, config!.key);
    expect(afterDelete.backup.data.tasks.map((task) => task.title)).toEqual(['From the phone']);
  });
});
