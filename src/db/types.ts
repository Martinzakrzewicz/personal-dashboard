import { z } from 'zod';

export const IMPORTANCE_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
export const importanceSchema = z.enum(IMPORTANCE_LEVELS);
export type Importance = z.infer<typeof importanceSchema>;

export const TASK_STATUSES = ['pending', 'in_progress', 'done', 'cancelled'] as const;
export const taskStatusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const MILESTONE_TYPES = ['exam', 'match', 'delivery', 'event', 'other'] as const;
export const milestoneTypeSchema = z.enum(MILESTONE_TYPES);
export type MilestoneType = z.infer<typeof milestoneTypeSchema>;

export const metadataSchema = z.record(z.string(), z.unknown());
export type Metadata = z.infer<typeof metadataSchema>;

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)');

const timestampSchema = z.string().min(1);

export const baseRecordSchema = z.object({
  id: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const spaceSchema = baseRecordSchema.extend({
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a hex color'),
  icon: z.string().min(1).max(60),
  order: z.number().int().nonnegative(),
  archived: z.boolean(),
  userId: z.string().nullable(),
  metadata: metadataSchema.default({}),
});
export type Space = z.infer<typeof spaceSchema>;

export const taskSchema = baseRecordSchema.extend({
  spaceId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  importance: importanceSchema,
  status: taskStatusSchema,
  dueDate: isoDateSchema.nullable(),
  notes: z.string().default(''),
  orderIndex: z.number().int().nonnegative(),
  completedAt: timestampSchema.nullable(),
  milestoneId: z.string().nullable(),
  metadata: metadataSchema.default({}),
});
export type Task = z.infer<typeof taskSchema>;

export const milestoneSchema = baseRecordSchema.extend({
  spaceId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  date: isoDateSchema,
  type: milestoneTypeSchema,
  linkedTaskId: z.string().nullable(),
  metadata: metadataSchema.default({}),
});
export type Milestone = z.infer<typeof milestoneSchema>;

export const blockPositionSchema = z.object({
  column: z.number().int().min(0).max(12),
  row: z.number().int().nonnegative(),
  width: z.number().int().min(3).max(12),
  height: z.number().int().positive(),
});
export type BlockPosition = z.infer<typeof blockPositionSchema>;

export const blockConfigSchema = z
  .object({ version: z.number().int().nonnegative() })
  .passthrough();
export type BlockConfig = z.infer<typeof blockConfigSchema>;

export const blockSchema = baseRecordSchema.extend({
  spaceId: z.string().min(1),
  type: z.string().min(1),
  position: blockPositionSchema,
  visible: z.boolean(),
  config: blockConfigSchema,
  order: z.number().int().nonnegative(),
});
export type Block = z.infer<typeof blockSchema>;

export const metaRecordSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});
export type MetaRecord = z.infer<typeof metaRecordSchema>;

export const BACKUP_FORMAT = 'personal-dashboard-backup';
export const BACKUP_VERSION = 1;

export const backupFileSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string().min(1),
  data: z.object({
    spaces: z.array(spaceSchema),
    tasks: z.array(taskSchema),
    milestones: z.array(milestoneSchema),
    blocks: z.array(blockSchema),
    meta: z.array(metaRecordSchema),
  }),
});
export type BackupFile = z.infer<typeof backupFileSchema>;

export type ThemePreference = 'system' | 'light' | 'dark';
export type Language = 'en' | 'es';
