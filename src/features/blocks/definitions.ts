import { z } from 'zod';
import { isoDateSchema } from '../../db/types';
import type { BlockConfig } from '../../db/types';
import { addDaysISO, todayISO } from '../../lib/dates';

export const tasksBlockConfigSchema = z.object({
  version: z.literal(1),
  showCompleted: z.boolean(),
});

export const calendarBlockConfigSchema = z.object({
  version: z.literal(2),
  days: z.literal(7),
});

export const notesBlockConfigSchema = z.object({
  version: z.literal(2),
  text: z.string(),
});

export const counterBlockConfigSchema = z.object({
  version: z.literal(1),
  label: z.string(),
  targetDate: isoDateSchema,
});

export type TasksBlockConfig = z.infer<typeof tasksBlockConfigSchema>;
export type CalendarBlockConfig = z.infer<typeof calendarBlockConfigSchema>;
export type NotesBlockConfig = z.infer<typeof notesBlockConfigSchema>;
export type CounterBlockConfig = z.infer<typeof counterBlockConfigSchema>;

export interface BlockDefinition {
  type: string;
  titleKey: string;
  descriptionKey: string;
  iconName: string;
  multiInstance: boolean;
  version: number;
  schema: z.ZodTypeAny;
  defaultConfig: BlockConfig;
  /** Runs one version step. Receives config at `fromVersion`; must return config with `version + 1`. */
  migrate: (config: unknown, fromVersion: number) => unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: 'tasks',
    titleKey: 'blocks.tasks.name',
    descriptionKey: 'blocks.tasks.description',
    iconName: 'ListTodo',
    multiInstance: false,
    version: 1,
    schema: tasksBlockConfigSchema,
    defaultConfig: { version: 1, showCompleted: true },
    migrate: (config) => ({ ...(isRecord(config) ? config : {}), version: 1 }),
  },
  {
    type: 'calendar',
    titleKey: 'blocks.calendar.name',
    descriptionKey: 'blocks.calendar.description',
    iconName: 'CalendarDays',
    multiInstance: true,
    version: 2,
    schema: calendarBlockConfigSchema,
    defaultConfig: { version: 2, days: 7 },
    /** v1 used a rolling 7/14-day window; v2 is always a rolling week summary. */
    migrate: (config) => ({ ...(isRecord(config) ? config : {}), version: 2, days: 7 }),
  },
  {
    type: 'notes',
    titleKey: 'blocks.notes.name',
    descriptionKey: 'blocks.notes.description',
    iconName: 'StickyNote',
    multiInstance: true,
    version: 2,
    schema: notesBlockConfigSchema,
    defaultConfig: { version: 2, text: '' },
    /**
     * v1 stored the note under `content`. v2 stores it under `text`. The
     * migration preserves existing notes and is covered by unit tests.
     */
    migrate: (config, fromVersion) => {
      const raw = isRecord(config) ? config : {};
      if (fromVersion < 2) {
        const text =
          typeof raw.text === 'string'
            ? raw.text
            : typeof raw.content === 'string'
              ? raw.content
              : '';
        const { content: _content, ...rest } = raw;
        return { ...rest, version: 2, text };
      }
      return { ...raw, version: 2 };
    },
  },
  {
    type: 'counter',
    titleKey: 'blocks.counter.name',
    descriptionKey: 'blocks.counter.description',
    iconName: 'Timer',
    multiInstance: true,
    version: 1,
    schema: counterBlockConfigSchema,
    defaultConfig: {
      version: 1,
      label: 'Next milestone',
      targetDate: addDaysISO(todayISO(), 30),
    },
    migrate: (config) => ({ ...(isRecord(config) ? config : {}), version: 1 }),
  },
];

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find((definition) => definition.type === type);
}

export interface NormalizedConfig {
  config: BlockConfig;
  migrated: boolean;
  known: boolean;
}

/**
 * Applies registry migrations in sequence and validates the result with the
 * block's Zod schema. Invalid or unknown-version configs fall back to defaults
 * instead of crashing the dashboard.
 */
export function normalizeBlockConfig(type: string, rawConfig: unknown): NormalizedConfig {
  const definition = getBlockDefinition(type);
  if (!definition) {
    const fallback: BlockConfig = isRecord(rawConfig)
      ? { version: typeof rawConfig.version === 'number' ? rawConfig.version : 1, ...rawConfig }
      : { version: 1 };
    return { config: fallback, migrated: false, known: false };
  }

  let config: Record<string, unknown> = isRecord(rawConfig) ? { ...rawConfig } : {};
  let version = typeof config.version === 'number' ? config.version : 0;

  if (version > definition.version) {
    return {
      config: { ...definition.defaultConfig },
      migrated: true,
      known: true,
    };
  }

  let migrated = version !== definition.version || !isRecord(rawConfig);
  let guard = 0;
  while (version < definition.version && guard < 10) {
    const next = definition.migrate(config, version);
    guard += 1;
    if (!isRecord(next) || typeof next.version !== 'number' || next.version <= version) {
      return { config: { ...definition.defaultConfig }, migrated: true, known: true };
    }
    config = { ...next };
    version = next.version;
    migrated = true;
  }

  const parsed = definition.schema.safeParse(config);
  if (!parsed.success) {
    return { config: { ...definition.defaultConfig }, migrated: true, known: true };
  }
  return { config: parsed.data as BlockConfig, migrated, known: true };
}

export function createDefaultConfig(type: string): BlockConfig {
  const definition = getBlockDefinition(type);
  return definition ? { ...definition.defaultConfig } : { version: 1 };
}
