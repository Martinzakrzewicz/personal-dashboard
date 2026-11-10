import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { db } from '../db/db';
import { resetAppStoreForTests } from '../app/store';
import { useSyncStore } from '../features/sync/store';
import i18n from '../i18n';

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  resetAppStoreForTests();
  useSyncStore.setState({ config: null, lastSyncedAt: null, status: 'idle', error: null });
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--space-accent');
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
});
