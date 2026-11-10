import { describe, expect, it } from 'vitest';
import { detectTrailingImportance, parseCapture } from './parser';
import type { Importance } from '../../db/types';

describe('express capture parser', () => {
  it.each([
    ['Finish the essay !1', 'Finish the essay', 'critical'],
    ['Call the coach !2', 'Call the coach', 'high'],
    ['Buy groceries !3', 'Buy groceries', 'medium'],
    ['Water the plants !4', 'Water the plants', 'low'],
  ] as const)('parses "%s" as %s (%s)', (raw, expectedTitle, expectedImportance) => {
    const result = parseCapture(raw);
    expect(result).toEqual({
      ok: true,
      value: { title: expectedTitle, importance: expectedImportance as Importance },
    });
  });

  it('defaults to medium when no token is present', () => {
    expect(parseCapture('Prepare slides')).toEqual({
      ok: true,
      value: { title: 'Prepare slides', importance: 'medium' },
    });
  });

  it('trims whitespace around the stripped title', () => {
    expect(parseCapture('   Read chapter 4   !1   ')).toEqual({
      ok: true,
      value: { title: 'Read chapter 4', importance: 'critical' },
    });
  });

  it('does not treat a token in the middle of the title as a priority', () => {
    expect(parseCapture('Buy !2 milk')).toEqual({
      ok: true,
      value: { title: 'Buy !2 milk', importance: 'medium' },
    });
  });

  it.each(['', '   ', '!1', '  !4  ', '!2 !3'])('rejects empty or token-only input "%s"', (raw) => {
    expect(parseCapture(raw)).toEqual({ ok: false, reason: 'empty' });
  });

  it('caps titles at 200 characters after stripping the token', () => {
    const result = parseCapture(`${'a'.repeat(260)} !1`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toHaveLength(200);
      expect(result.value.importance).toBe('critical');
    }
  });

  it('detects a trailing token for live hints', () => {
    expect(detectTrailingImportance('Study !1')).toBe('critical');
    expect(detectTrailingImportance('Study')).toBeNull();
    expect(detectTrailingImportance('Study !1 tomorrow')).toBeNull();
  });
});
