import { describe, expect, it } from 'vitest';
import {
  BLOCK_CATALOG,
  BLOCK_REGISTRY,
  getRegisteredBlock,
} from './registry';
import { normalizeBlockConfig } from './definitions';

describe('block registry', () => {
  it('registers all four built-in block types with components and icons', () => {
    expect(BLOCK_CATALOG.map((entry) => entry.type).sort()).toEqual([
      'calendar',
      'counter',
      'notes',
      'tasks',
    ]);

    for (const entry of BLOCK_CATALOG) {
      expect(entry.Component).toBeTruthy();
      expect(entry.Icon).toBeTruthy();
      expect(entry.schema).toBeTruthy();
      expect(entry.defaultConfig.version).toBe(entry.version);
      expect(entry.titleKey).toMatch(/^blocks\./);
    }
  });

  it('enforces tasks as single-instance and the other blocks as multi-instance', () => {
    expect(getRegisteredBlock('tasks')?.multiInstance).toBe(false);
    expect(getRegisteredBlock('calendar')?.multiInstance).toBe(true);
    expect(getRegisteredBlock('notes')?.multiInstance).toBe(true);
    expect(getRegisteredBlock('counter')?.multiInstance).toBe(true);
    expect(BLOCK_REGISTRY.tasks?.type).toBe('tasks');
  });

  it('migrates a legacy notes config from v1 to v2', () => {
    const result = normalizeBlockConfig('notes', { version: 1, content: 'Legacy note' });

    expect(result.known).toBe(true);
    expect(result.migrated).toBe(true);
    expect(result.config).toEqual({ version: 2, text: 'Legacy note' });
  });

  it('leaves current configs untouched and falls back safely on invalid configs', () => {
    const current = normalizeBlockConfig('notes', { version: 2, text: 'Current' });
    expect(current.migrated).toBe(false);
    expect(current.config).toEqual({ version: 2, text: 'Current' });

    const invalid = normalizeBlockConfig('calendar', { version: 1, days: 99 });
    expect(invalid.config).toEqual({ version: 1, days: 14 });
  });

  it('keeps unknown block types but marks them unknown', () => {
    const unknown = normalizeBlockConfig('future-widget', { version: 3, foo: 'bar' });
    expect(unknown.known).toBe(false);
    expect(unknown.config.version).toBe(3);
    expect(getRegisteredBlock('future-widget')).toBeUndefined();
  });
});
