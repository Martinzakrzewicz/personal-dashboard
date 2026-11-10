import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { db } from '../db/db';
import { resetAppStoreForTests } from '../app/store';
import i18n from '../i18n';

beforeEach(async () => {
  await db.delete();
  await db.open();
  resetAppStoreForTests();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--space-accent');
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
});
