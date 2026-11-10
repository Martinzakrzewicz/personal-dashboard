import Dexie, { type Table } from 'dexie';
import type { Block, MetaRecord, Milestone, Space, Task } from './types';

export class DashboardDatabase extends Dexie {
  spaces!: Table<Space, string>;
  tasks!: Table<Task, string>;
  milestones!: Table<Milestone, string>;
  blocks!: Table<Block, string>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super('personal-dashboard');
    this.version(1).stores({
      spaces: 'id, order, archived',
      tasks: 'id, spaceId, [spaceId+status], [spaceId+dueDate]',
      milestones: 'id, spaceId, [spaceId+date]',
      blocks: 'id, spaceId',
      meta: 'key',
    });
  }
}

export const db = new DashboardDatabase();
