import { describe, expect, it } from 'vitest';
import {
  addMonthsISO,
  isSameMonth,
  mondayIndex,
  monthGridDates,
  rollingWeek,
} from './dates';

describe('calendar date helpers', () => {
  it('builds a six-week Monday-first month grid', () => {
    const grid = monthGridDates('2026-11-10');
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-10-26');
    expect(grid[41]).toBe('2026-12-06');
    expect(grid).toContain('2026-11-30');
  });

  it('builds a rolling week starting on the current day', () => {
    // 2026-11-10 is a Tuesday.
    expect(mondayIndex('2026-11-10')).toBe(1);
    expect(rollingWeek('2026-11-10')).toEqual([
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
    ]);
  });

  it('navigates months and compares month membership', () => {
    expect(addMonthsISO('2026-11-10', 1)).toBe('2026-12-01');
    expect(addMonthsISO('2026-01-31', -1)).toBe('2025-12-01');
    expect(isSameMonth('2026-11-01', '2026-11-30')).toBe(true);
    expect(isSameMonth('2026-11-01', '2026-12-01')).toBe(false);
  });
});
