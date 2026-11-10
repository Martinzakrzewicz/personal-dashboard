import { create } from 'zustand';
import i18n, { type SupportedLanguage } from '../i18n';
import { useToastStore } from './toast';
import {
  archiveSpace as archiveSpaceRecord,
  createSpace as createSpaceRecord,
  listSpaces,
  moveSpace as moveSpaceRecord,
  restoreSpace as restoreSpaceRecord,
  updateSpace as updateSpaceRecord,
  type CreateSpaceInput,
  type UpdateSpaceInput,
} from '../db/spaces.repo';
import {
  createTask as createTaskRecord,
  deleteTask as deleteTaskRecord,
  listTasks,
  updateTask as updateTaskRecord,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '../db/tasks.repo';
import {
  createMilestone as createMilestoneRecord,
  deleteMilestone as deleteMilestoneRecord,
  listMilestones,
  updateMilestone as updateMilestoneRecord,
  type CreateMilestoneInput,
  type UpdateMilestoneInput,
} from '../db/milestones.repo';
import {
  createBlock as createBlockRecord,
  deleteBlock as deleteBlockRecord,
  listBlocks,
  updateBlock as updateBlockRecord,
} from '../db/blocks.repo';
import { getMeta, setMeta } from '../db/meta.repo';
import { seedIfEmpty, createDefaultBlocksForSpace } from '../db/seed';
import { importBackup as importBackupRecord } from '../db/backup';
import { normalizeBlockConfig, getBlockDefinition } from '../features/blocks/definitions';
import { parseCapture } from '../features/capture/parser';
import type {
  BackupFile,
  Block,
  BlockConfig,
  Language,
  Milestone,
  Space,
  Task,
  TaskStatus,
  ThemePreference,
} from '../db/types';
import { newId, nowIso } from '../lib/id';
import { clearDeletionLog } from '../lib/deletion-log';

let loadToken = 0;
let initPromise: Promise<void> | null = null;

export type DetailView = 'tasks' | 'calendar' | 'notes';

const DEFAULT_ACCENT = '#3B82F6';

export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
}

export async function applyLanguage(language: Language): Promise<void> {
  document.documentElement.lang = language;
  await i18n.changeLanguage(language);
}

function relativeLuminance(red: number, green: number, blue: number): number {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrastFor(hex: string): string {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  if ([red, green, blue].some(Number.isNaN)) return '#FFFFFF';

  const accentLuminance = relativeLuminance(red, green, blue);
  const whiteContrast = 1.05 / (accentLuminance + 0.05);
  const darkLuminance = relativeLuminance(15, 23, 42);
  const darkContrast = (accentLuminance + 0.05) / (darkLuminance + 0.05);
  return whiteContrast >= darkContrast ? '#FFFFFF' : '#0F172A';
}

export function applyAccent(color: string | null | undefined): void {
  const accent = color ?? DEFAULT_ACCENT;
  const root = document.documentElement;
  root.style.setProperty('--space-accent', accent);
  root.style.setProperty('--space-accent-contrast', contrastFor(accent));
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', accent);
}

function toastError(message: string): void {
  useToastStore.getState().push(message, 'error');
}

function toastSuccess(message: string): void {
  useToastStore.getState().push(message, 'success');
}

function isLanguage(value: unknown): value is SupportedLanguage {
  return value === 'en' || value === 'es';
}

function isTheme(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

interface AppStore {
  initialized: boolean;
  loadingSpace: boolean;
  activeSpaceId: string | null;
  spaces: Space[];
  tasks: Task[];
  milestones: Milestone[];
  blocks: Block[];
  language: SupportedLanguage;
  theme: ThemePreference;
  editMode: boolean;
  detailView: DetailView | null;

  init: () => Promise<void>;
  openDetail: (view: DetailView) => void;
  closeDetail: () => void;
  reloadFromDatabase: () => Promise<void>;
  refreshSpaces: () => Promise<void>;
  switchSpace: (spaceId: string) => Promise<void>;
  createSpace: (input: CreateSpaceInput) => Promise<Space | null>;
  updateSpace: (id: string, patch: UpdateSpaceInput) => Promise<boolean>;
  archiveSpace: (id: string) => Promise<void>;
  restoreSpace: (id: string) => Promise<void>;
  moveSpace: (id: string, direction: 'up' | 'down') => Promise<void>;

  capture: (raw: string) => Promise<boolean>;
  createTask: (input: CreateTaskInput) => Promise<Task | null>;
  updateTask: (id: string, patch: UpdateTaskInput, spaceIdOverride?: string) => Promise<Task | null>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string, spaceIdOverride?: string) => Promise<boolean>;

  createMilestone: (input: CreateMilestoneInput) => Promise<Milestone | null>;
  updateMilestone: (id: string, patch: UpdateMilestoneInput) => Promise<boolean>;
  deleteMilestone: (id: string) => Promise<boolean>;

  addBlock: (type: string) => Promise<boolean>;
  updateBlock: (id: string, patch: Partial<Pick<Block, 'visible' | 'config' | 'position'>>) => Promise<void>;
  removeBlock: (id: string) => Promise<void>;
  moveBlock: (id: string, direction: 'up' | 'down') => Promise<void>;
  saveBlockConfig: (id: string, config: BlockConfig) => Promise<boolean>;
  setEditMode: (enabled: boolean) => void;

  setLanguage: (language: SupportedLanguage) => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  replaceWithBackup: (backup: BackupFile) => Promise<boolean>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  initialized: false,
  loadingSpace: false,
  activeSpaceId: null,
  spaces: [],
  tasks: [],
  milestones: [],
  blocks: [],
  language: 'en',
  theme: 'system',
  editMode: false,
  detailView: null,

  openDetail: (view) => set({ detailView: view }),
  closeDetail: () => set({ detailView: null }),

  reloadFromDatabase: async () => {
    try {
      const spaces = await listSpaces();
      const currentId = get().activeSpaceId;
      const next =
        spaces.find((space) => !space.archived && space.id === currentId) ??
        spaces.find((space) => !space.archived) ??
        null;
      set({ spaces });
      if (next) {
        await get().switchSpace(next.id);
      } else {
        set({ activeSpaceId: null, tasks: [], milestones: [], blocks: [], loadingSpace: false });
      }
    } catch {
      toastError(i18n.t('errors.loadSpaces'));
    }
  },

  init: async () => {
    if (get().initialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        await seedIfEmpty();
        const [spaces, languageRaw, themeRaw, lastActiveRaw] = await Promise.all([
          listSpaces(),
          getMeta<unknown>('language'),
          getMeta<unknown>('theme'),
          getMeta<unknown>('lastActiveSpaceId'),
        ]);

        const language: SupportedLanguage = isLanguage(languageRaw) ? languageRaw : 'en';
        const theme: ThemePreference = isTheme(themeRaw) ? themeRaw : 'system';
        applyTheme(theme);
        await applyLanguage(language);
        set({ spaces, language, theme });

        const preferred =
          spaces.find((space) => !space.archived && space.id === lastActiveRaw) ??
          spaces.find((space) => !space.archived) ??
          null;

        if (preferred) {
          await get().switchSpace(preferred.id);
        } else {
          applyAccent(null);
          set({ activeSpaceId: null, initialized: true });
        }
      } catch {
        toastError(i18n.t('errors.loadSpaces'));
        set({ initialized: true, loadingSpace: false });
      }
    })().finally(() => {
      initPromise = null;
    });

    return initPromise;
  },

  refreshSpaces: async () => {
    try {
      const spaces = await listSpaces();
      set({ spaces });
    } catch {
      toastError(i18n.t('errors.loadSpaces'));
    }
  },

  switchSpace: async (spaceId) => {
    const space = get().spaces.find((entry) => entry.id === spaceId);
    if (!space || space.archived) return;

    loadToken += 1;
    const token = loadToken;
    // Clear first: the previous space's data must never be visible during a switch.
    set({
      activeSpaceId: spaceId,
      tasks: [],
      milestones: [],
      blocks: [],
      loadingSpace: true,
    });
    applyAccent(space.color);

    try {
      const [tasks, milestones, loadedBlocks] = await Promise.all([
        listTasks(spaceId),
        listMilestones(spaceId),
        listBlocks(spaceId),
      ]);

      const normalizedBlocks: Block[] = loadedBlocks.map((block) => {
        const normalized = normalizeBlockConfig(block.type, block.config);
        return normalized.migrated ? { ...block, config: normalized.config } : block;
      });

      if (token !== loadToken || get().activeSpaceId !== spaceId) return;

      set({ tasks, milestones, blocks: normalizedBlocks, loadingSpace: false, initialized: true });

      const migrationWrites = normalizedBlocks
        .filter((block, index) => block.config !== loadedBlocks[index]?.config)
        .map((block) => updateBlockRecord(spaceId, block.id, { config: block.config }));
      if (migrationWrites.length > 0) {
        void Promise.all(migrationWrites).catch(() => undefined);
      }

      void setMeta('lastActiveSpaceId', spaceId).catch(() => undefined);
    } catch {
      if (token === loadToken) {
        set({ loadingSpace: false, initialized: true });
        toastError(i18n.t('errors.loadSpace'));
      }
    }
  },

  createSpace: async (input) => {
    try {
      const space = await createSpaceRecord(input);
      await createDefaultBlocksForSpace(space.id);
      const spaces = await listSpaces();
      set({ spaces });
      toastSuccess(i18n.t('spaces.created'));
      await get().switchSpace(space.id);
      return space;
    } catch {
      toastError(i18n.t('errors.loadSpaces'));
      return null;
    }
  },

  updateSpace: async (id, patch) => {
    try {
      const updated = await updateSpaceRecord(id, patch);
      set((state) => ({
        spaces: state.spaces.map((space) => (space.id === id ? updated : space)),
      }));
      if (get().activeSpaceId === id) applyAccent(updated.color);
      return true;
    } catch {
      toastError(i18n.t('errors.loadSpaces'));
      return false;
    }
  },

  archiveSpace: async (id) => {
    try {
      await archiveSpaceRecord(id);
      const spaces = await listSpaces();
      set({ spaces });
      toastSuccess(i18n.t('spaces.archived'));
      if (get().activeSpaceId === id) {
        const next = spaces.find((space) => !space.archived);
        if (next) {
          await get().switchSpace(next.id);
        } else {
          loadToken += 1;
          set({ activeSpaceId: null, tasks: [], milestones: [], blocks: [], loadingSpace: false });
          applyAccent(null);
        }
      }
    } catch {
      toastError(i18n.t('errors.loadSpaces'));
    }
  },

  restoreSpace: async (id) => {
    try {
      await restoreSpaceRecord(id);
      await get().refreshSpaces();
      toastSuccess(i18n.t('spaces.restored'));
    } catch {
      toastError(i18n.t('errors.loadSpaces'));
    }
  },

  moveSpace: async (id, direction) => {
    try {
      await moveSpaceRecord(id, direction);
      await get().refreshSpaces();
    } catch {
      toastError(i18n.t('errors.loadSpaces'));
    }
  },

  capture: async (raw) => {
    const spaceId = get().activeSpaceId;
    if (!spaceId) return false;
    const parsed = parseCapture(raw);
    if (!parsed.ok) {
      toastError(i18n.t('capture.emptyError'));
      return false;
    }

    const createdAt = nowIso();
    const maxOrder = get().tasks.reduce((max, task) => Math.max(max, task.orderIndex), -1);
    const optimistic: Task = {
      id: newId(),
      spaceId,
      title: parsed.value.title,
      importance: parsed.value.importance,
      status: 'pending',
      dueDate: null,
      notes: '',
      orderIndex: maxOrder + 1,
      completedAt: null,
      milestoneId: null,
      metadata: {},
      createdAt,
      updatedAt: createdAt,
    };

    set((state) => ({ tasks: [...state.tasks, optimistic] }));

    try {
      const saved = await createTaskRecord(
        spaceId,
        {
          title: optimistic.title,
          importance: optimistic.importance,
          orderIndex: optimistic.orderIndex,
        },
        optimistic.id,
      );
      if (get().activeSpaceId === spaceId) {
        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === saved.id ? saved : task)),
        }));
      }
      return true;
    } catch {
      if (get().activeSpaceId === spaceId) {
        set((state) => ({ tasks: state.tasks.filter((task) => task.id !== optimistic.id) }));
      }
      toastError(i18n.t('capture.failed'));
      return false;
    }
  },

  createTask: async (input) => {
    const spaceId = get().activeSpaceId;
    if (!spaceId) return null;
    try {
      const task = await createTaskRecord(spaceId, input);
      if (get().activeSpaceId === spaceId) {
        set((state) => ({ tasks: [...state.tasks, task] }));
      }
      return task;
    } catch {
      toastError(i18n.t('errors.saveTask'));
      return null;
    }
  },

  updateTask: async (id, patch, spaceIdOverride) => {
    const spaceId = spaceIdOverride ?? get().activeSpaceId;
    if (!spaceId) return null;
    try {
      const updated = await updateTaskRecord(spaceId, id, patch);
      if (get().activeSpaceId === spaceId) {
        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === id ? updated : task)),
        }));
      }
      return updated;
    } catch {
      toastError(i18n.t('errors.saveTask'));
      return null;
    }
  },

  toggleTask: async (id) => {
    const task = get().tasks.find((entry) => entry.id === id);
    if (!task) return;
    const nextStatus: TaskStatus = task.status === 'done' ? 'pending' : 'done';
    await get().updateTask(id, { status: nextStatus });
  },

  deleteTask: async (id, spaceIdOverride) => {
    const spaceId = spaceIdOverride ?? get().activeSpaceId;
    if (!spaceId) return false;
    try {
      await deleteTaskRecord(spaceId, id);
      if (get().activeSpaceId === spaceId) {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          milestones: state.milestones.map((milestone) =>
            milestone.linkedTaskId === id ? { ...milestone, linkedTaskId: null } : milestone,
          ),
        }));
      }
      toastSuccess(i18n.t('tasks.deleted'));
      return true;
    } catch {
      toastError(i18n.t('errors.deleteTask'));
      return false;
    }
  },

  createMilestone: async (input) => {
    const spaceId = get().activeSpaceId;
    if (!spaceId) return null;
    try {
      const milestone = await createMilestoneRecord(spaceId, input);
      if (get().activeSpaceId === spaceId) {
        set((state) => ({ milestones: [...state.milestones, milestone] }));
      }
      return milestone;
    } catch {
      toastError(i18n.t('errors.saveMilestone'));
      return null;
    }
  },

  updateMilestone: async (id, patch) => {
    const spaceId = get().activeSpaceId;
    if (!spaceId) return false;
    try {
      const updated = await updateMilestoneRecord(spaceId, id, patch);
      if (get().activeSpaceId === spaceId) {
        set((state) => ({
          milestones: state.milestones.map((milestone) => (milestone.id === id ? updated : milestone)),
        }));
      }
      return true;
    } catch {
      toastError(i18n.t('errors.saveMilestone'));
      return false;
    }
  },

  deleteMilestone: async (id) => {
    const spaceId = get().activeSpaceId;
    if (!spaceId) return false;
    try {
      await deleteMilestoneRecord(spaceId, id);
      set((state) => ({
        milestones: state.milestones.filter((milestone) => milestone.id !== id),
        tasks: state.tasks.map((task) =>
          task.milestoneId === id ? { ...task, milestoneId: null } : task,
        ),
      }));
      return true;
    } catch {
      toastError(i18n.t('errors.deleteMilestone'));
      return false;
    }
  },

  addBlock: async (type) => {
    const spaceId = get().activeSpaceId;
    if (!spaceId) return false;
    const definition = getBlockDefinition(type);
    if (!definition) return false;
    if (!definition.multiInstance && get().blocks.some((block) => block.type === type)) {
      return false;
    }
    try {
      const order =
        get().blocks.reduce((max, block) => Math.max(max, block.order), -1) + 1;
      const block = await createBlockRecord({
        spaceId,
        type,
        position: { column: 0, row: 0, width: type === 'tasks' ? 8 : 6, height: 4 },
        visible: true,
        config: { ...definition.defaultConfig },
        order,
      });
      if (get().activeSpaceId === spaceId) {
        set((state) => ({ blocks: [...state.blocks, block].sort((a, b) => a.order - b.order) }));
      }
      return true;
    } catch {
      toastError(i18n.t('errors.saveBlock'));
      return false;
    }
  },

  updateBlock: async (id, patch) => {
    const spaceId = get().activeSpaceId;
    if (!spaceId) return;
    try {
      const updated = await updateBlockRecord(spaceId, id, patch);
      if (get().activeSpaceId === spaceId) {
        set((state) => ({
          blocks: state.blocks.map((block) => (block.id === id ? updated : block)),
        }));
      }
    } catch {
      toastError(i18n.t('errors.saveBlock'));
    }
  },

  removeBlock: async (id) => {
    const spaceId = get().activeSpaceId;
    if (!spaceId) return;
    try {
      await deleteBlockRecord(spaceId, id);
      if (get().activeSpaceId === spaceId) {
        set((state) => ({ blocks: state.blocks.filter((block) => block.id !== id) }));
      }
    } catch {
      toastError(i18n.t('errors.saveBlock'));
    }
  },

  moveBlock: async (id, direction) => {
    const spaceId = get().activeSpaceId;
    if (!spaceId) return;
    const sorted = [...get().blocks].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((block) => block.id === id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;
    const current = sorted[index];
    const target = sorted[targetIndex];
    if (!current || !target) return;
    try {
      await updateBlockRecord(spaceId, current.id, { order: target.order });
      await updateBlockRecord(spaceId, target.id, { order: current.order });
      const blocks = await listBlocks(spaceId);
      if (get().activeSpaceId === spaceId) set({ blocks });
    } catch {
      toastError(i18n.t('errors.saveBlock'));
    }
  },

  saveBlockConfig: async (id, config) => {
    const spaceId = get().activeSpaceId;
    if (!spaceId) return false;
    try {
      const updated = await updateBlockRecord(spaceId, id, { config });
      if (get().activeSpaceId === spaceId) {
        set((state) => ({
          blocks: state.blocks.map((block) => (block.id === id ? updated : block)),
        }));
      }
      return true;
    } catch {
      toastError(i18n.t('errors.saveBlock'));
      return false;
    }
  },

  setEditMode: (enabled) => set({ editMode: enabled }),

  setLanguage: async (language) => {
    set({ language });
    await applyLanguage(language);
    try {
      await setMeta('language', language);
    } catch {
      toastError(i18n.t('errors.saveSettings'));
    }
  },

  setTheme: async (theme) => {
    set({ theme });
    applyTheme(theme);
    try {
      await setMeta('theme', theme);
    } catch {
      toastError(i18n.t('errors.saveSettings'));
    }
  },

  replaceWithBackup: async (backup) => {
    try {
      clearDeletionLog();
      await importBackupRecord(backup);
      loadToken += 1;
      set({
        initialized: false,
        loadingSpace: false,
        activeSpaceId: null,
        spaces: [],
        tasks: [],
        milestones: [],
        blocks: [],
        editMode: false,
      });
      await get().init();
      toastSuccess(i18n.t('settings.imported'));
      return true;
    } catch {
      toastError(i18n.t('errors.import'));
      return false;
    }
  },
}));

/** Test helper: resets in-memory state without touching IndexedDB. */
export function resetAppStoreForTests(): void {
  loadToken += 1;
  useAppStore.setState({
    initialized: false,
    loadingSpace: false,
    activeSpaceId: null,
    spaces: [],
    tasks: [],
    milestones: [],
    blocks: [],
    language: 'en',
    theme: 'system',
    editMode: false,
    detailView: null,
  });
}
