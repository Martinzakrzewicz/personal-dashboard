import type { Importance } from '../../db/types';

export const TOKEN_TO_IMPORTANCE: Record<string, Importance> = {
  '!1': 'critical',
  '!2': 'high',
  '!3': 'medium',
  '!4': 'low',
};

export const MAX_CAPTURE_TITLE = 200;

const TRAILING_TOKEN = /\s*!(1|2|3|4)\s*$/;

export interface ParsedCapture {
  title: string;
  importance: Importance;
}

export type CaptureParseResult =
  | { ok: true; value: ParsedCapture }
  | { ok: false; reason: 'empty' };

export function importanceFromToken(token: string): Importance | null {
  return TOKEN_TO_IMPORTANCE[token] ?? null;
}

/** Detects a trailing !1–!4 token without stripping anything (used for live hints). */
export function detectTrailingImportance(raw: string): Importance | null {
  const match = raw.match(TRAILING_TOKEN);
  if (!match) return null;
  return importanceFromToken(`!${match[1]}`);
}

/**
 * Express-capture parser. A trailing !1–!4 token sets importance; everything
 * before it (trimmed, capped at 200 characters) becomes the title.
 */
export function parseCapture(raw: string): CaptureParseResult {
  const match = raw.match(TRAILING_TOKEN);
  const importance: Importance = match
    ? (importanceFromToken(`!${match[1]}`) ?? 'medium')
    : 'medium';
  const withoutToken = match ? raw.slice(0, match.index) : raw;
  const title = withoutToken.trim().slice(0, MAX_CAPTURE_TITLE);
  // Reject whitespace and inputs that only contain priority tokens.
  if (!title || /^!(1|2|3|4)$/.test(title)) return { ok: false, reason: 'empty' };
  return { ok: true, value: { title, importance } };
}
