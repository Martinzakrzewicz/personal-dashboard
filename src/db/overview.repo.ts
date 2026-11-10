import type { Block, Milestone, Space, Task } from './types';
import { listActiveSpaces } from './spaces.repo';
import { listTasks } from './tasks.repo';
import { listMilestones } from './milestones.repo';
import { listBlocks } from './blocks.repo';

export interface SpaceOverview {
  space: Space;
  tasks: Task[];
  milestones: Milestone[];
  blocks: Block[];
}

export interface OverviewSnapshot {
  spaces: SpaceOverview[];
}

/**
 * Cross-space read model for the focus/full views.
 *
 * It deliberately keeps the repository contract intact: every table read is
 * still scoped by a single spaceId. Aggregation happens here, in one explicit
 * place, instead of exposing an unfiltered repository query.
 */
export async function loadOverview(): Promise<OverviewSnapshot> {
  const spaces = await listActiveSpaces();
  const overview = await Promise.all(
    spaces.map(async (space) => ({
      space,
      tasks: await listTasks(space.id),
      milestones: await listMilestones(space.id),
      blocks: await listBlocks(space.id),
    })),
  );
  return { spaces: overview };
}
