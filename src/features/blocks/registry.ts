import {
  Blocks,
  CalendarDays,
  ListTodo,
  StickyNote,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { BLOCK_DEFINITIONS, type BlockDefinition } from './definitions';
import { TasksBlock, type BlockComponentProps } from './components/TasksBlock';
import { CalendarBlock } from './components/CalendarBlock';
import { NotesBlock } from './components/NotesBlock';
import { CounterBlock } from './components/CounterBlock';

export type { BlockComponentProps };

const COMPONENTS: Record<string, ComponentType<BlockComponentProps>> = {
  tasks: TasksBlock,
  calendar: CalendarBlock,
  notes: NotesBlock,
  counter: CounterBlock,
};

const ICONS: Record<string, LucideIcon> = {
  ListTodo,
  CalendarDays,
  StickyNote,
  Timer,
  Blocks,
};

export interface RegisteredBlock extends BlockDefinition {
  Component: ComponentType<BlockComponentProps>;
  Icon: LucideIcon;
}

/**
 * The single place where a new block type is registered. Adding a type only
 * requires a definition + component entry here; the grid renderer is generic.
 */
export const BLOCK_REGISTRY: Record<string, RegisteredBlock> = Object.fromEntries(
  BLOCK_DEFINITIONS.map((definition) => [
    definition.type,
    {
      ...definition,
      Component: COMPONENTS[definition.type] ?? (() => null),
      Icon: ICONS[definition.iconName] ?? Blocks,
    },
  ]),
);

export const BLOCK_CATALOG: RegisteredBlock[] = Object.values(BLOCK_REGISTRY);

export function getRegisteredBlock(type: string): RegisteredBlock | undefined {
  return BLOCK_REGISTRY[type];
}
