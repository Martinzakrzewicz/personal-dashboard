import { newId } from '../../lib/id';
import { createSyncCode } from './crypto';

export interface SyncConfig {
  gistId: string;
  token: string;
  key: string;
  syncCode: string;
  deviceId: string;
  lastSyncedAt: string | null;
}

const STORAGE_KEY = 'pd.sync.config.v1';

export function loadSyncConfig(): SyncConfig | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SyncConfig>;
    if (
      typeof parsed.gistId !== 'string' ||
      typeof parsed.token !== 'string' ||
      typeof parsed.key !== 'string'
    ) {
      return null;
    }
    return {
      gistId: parsed.gistId,
      token: parsed.token,
      key: parsed.key,
      syncCode: parsed.syncCode ?? createSyncCode(parsed.gistId, parsed.key),
      deviceId: parsed.deviceId ?? newId(),
      lastSyncedAt: parsed.lastSyncedAt ?? null,
    };
  } catch {
    return null;
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // The sync UI surfaces a generic error if persistence is unavailable.
  }
}

export function clearSyncConfig(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
