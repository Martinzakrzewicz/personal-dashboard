import { create } from 'zustand';
import { useAppStore } from '../../app/store';
import { exportBackup, importBackup } from '../../db/backup';
import { clearSyncConfig, loadSyncConfig, saveSyncConfig, type SyncConfig } from './config';
import { createSyncCode, generateSyncKey, parseSyncCode } from './crypto';
import {
  createEncryptedGist,
  readGist,
  SyncError,
  validateToken,
  writeEncryptedPayload,
  type SyncErrorCode,
} from './gist';
import {
  backupDataEqual,
  createSyncPayload,
  mergeSyncPayloads,
  payloadDataEqual,
} from './merge';
import { setDeletionLog } from '../../lib/deletion-log';
import { newId, nowIso } from '../../lib/id';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface SyncStore {
  config: SyncConfig | null;
  lastSyncedAt: string | null;
  status: SyncStatus;
  error: SyncErrorCode | null;
  init: () => void;
  createSync: (token: string) => Promise<string>;
  joinSync: (token: string, syncCode: string) => Promise<void>;
  syncNow: () => Promise<void>;
  disconnect: () => void;
}

let inFlight: Promise<void> | null = null;

function errorCode(error: unknown): SyncErrorCode {
  if (error instanceof SyncError) return error.code;
  return 'unknown';
}

async function applyMerged(
  config: SyncConfig,
  mergedBackup: Awaited<ReturnType<typeof exportBackup>>,
  mergedData: ReturnType<typeof mergeSyncPayloads>,
  remoteData: ReturnType<typeof mergeSyncPayloads>,
): Promise<void> {
  const local = await exportBackup();
  if (!backupDataEqual(local, mergedBackup)) {
    await importBackup(mergedBackup);
    setDeletionLog(mergedData.tombstones);
    await useAppStore.getState().reloadFromDatabase();
  } else {
    setDeletionLog(mergedData.tombstones);
  }
  if (!payloadDataEqual(mergedData, remoteData)) {
    await writeEncryptedPayload(config, mergedData);
  }
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  config: null,
  lastSyncedAt: null,
  status: 'idle',
  error: null,

  init: () => {
    const config = loadSyncConfig();
    set({
      config,
      lastSyncedAt: config?.lastSyncedAt ?? null,
      status: 'idle',
      error: null,
    });
  },

  createSync: async (token) => {
    const cleanToken = token.trim();
    if (!cleanToken) throw new SyncError('token', 'Token is required');
    set({ status: 'syncing', error: null });
    try {
      await validateToken(cleanToken);
      const key = generateSyncKey();
      const deviceId = newId();
      const payload = createSyncPayload(await exportBackup(), deviceId);
      const gistId = await createEncryptedGist(cleanToken, key, payload);
      const config: SyncConfig = {
        gistId,
        token: cleanToken,
        key,
        syncCode: createSyncCode(gistId, key),
        deviceId,
        lastSyncedAt: nowIso(),
      };
      saveSyncConfig(config);
      set({ config, lastSyncedAt: config.lastSyncedAt, status: 'synced', error: null });
      return config.syncCode;
    } catch (error) {
      set({ status: 'error', error: errorCode(error) });
      throw error;
    }
  },

  joinSync: async (token, syncCode) => {
    const cleanToken = token.trim();
    const parsedCode = parseSyncCode(syncCode);
    if (!cleanToken) throw new SyncError('token', 'Token is required');
    if (!parsedCode) throw new SyncError('invalid', 'Sync code is invalid');

    set({ status: 'syncing', error: null });
    try {
      await validateToken(cleanToken);
      const remote = await readGist(cleanToken, parsedCode.gistId, parsedCode.key);
      const local = createSyncPayload(await exportBackup(), newId());
      const merged = mergeSyncPayloads(local, remote);
      const config: SyncConfig = {
        gistId: parsedCode.gistId,
        token: cleanToken,
        key: parsedCode.key,
        syncCode,
        deviceId: local.deviceId,
        lastSyncedAt: nowIso(),
      };
      saveSyncConfig(config);
      set({ config, status: 'syncing', error: null });
      await applyMerged(config, merged.backup, merged, remote);
      set({
        status: 'synced',
        error: null,
        lastSyncedAt: config.lastSyncedAt,
        config,
      });
    } catch (error) {
      set({ status: 'error', error: errorCode(error) });
      throw error;
    }
  },

  syncNow: async () => {
    const config = get().config;
    if (!config) return;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      set({ status: 'syncing', error: null });
      try {
        const remote = await readGist(config.token, config.gistId, config.key);
        const local = createSyncPayload(await exportBackup(), config.deviceId);
        const merged = mergeSyncPayloads(local, remote);

        if (!backupDataEqual(local.backup, merged.backup)) {
          await importBackup(merged.backup);
          setDeletionLog(merged.tombstones);
          await useAppStore.getState().reloadFromDatabase();
        } else {
          setDeletionLog(merged.tombstones);
        }

        if (!payloadDataEqual(merged, remote)) {
          await writeEncryptedPayload(config, merged);
        }

        const nextConfig: SyncConfig = { ...config, lastSyncedAt: nowIso() };
        saveSyncConfig(nextConfig);
        if (get().config?.gistId === config.gistId) {
          set({
            config: nextConfig,
            lastSyncedAt: nextConfig.lastSyncedAt,
            status: 'synced',
            error: null,
          });
        }
      } catch (error) {
        if (get().config?.gistId === config.gistId) {
          set({ status: 'error', error: errorCode(error) });
        }
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  },

  disconnect: () => {
    clearSyncConfig();
    set({ config: null, lastSyncedAt: null, status: 'idle', error: null });
  },
}));
