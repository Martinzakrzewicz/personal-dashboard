import { db } from './db';
import { consolidateData } from './consolidate';

/**
 * One-time/idempotent cleanup for spaces created independently on different
 * devices (for example two "University" spaces with different UUIDs).
 * Returns true when rows were rewritten.
 */
export async function consolidateDuplicateSpaces(): Promise<boolean> {
  return db.transaction(
    'rw',
    db.spaces,
    db.tasks,
    db.milestones,
    db.blocks,
    db.meta,
    async () => {
      const [spaces, tasks, milestones, blocks] = await Promise.all([
        db.spaces.toArray(),
        db.tasks.toArray(),
        db.milestones.toArray(),
        db.blocks.toArray(),
      ]);

      const result = consolidateData({ spaces, tasks, milestones, blocks });
      if (!result.changed) return false;

      await db.spaces.clear();
      await db.tasks.clear();
      await db.milestones.clear();
      await db.blocks.clear();

      if (result.data.spaces.length > 0) await db.spaces.bulkAdd(result.data.spaces);
      if (result.data.tasks.length > 0) await db.tasks.bulkAdd(result.data.tasks);
      if (result.data.milestones.length > 0) {
        await db.milestones.bulkAdd(result.data.milestones);
      }
      if (result.data.blocks.length > 0) await db.blocks.bulkAdd(result.data.blocks);

      const activeSpace = await db.meta.get('lastActiveSpaceId');
      if (typeof activeSpace?.value === 'string' && result.spaceRemap[activeSpace.value]) {
        await db.meta.put({
          key: 'lastActiveSpaceId',
          value: result.spaceRemap[activeSpace.value],
        });
      }

      return true;
    },
  );
}
