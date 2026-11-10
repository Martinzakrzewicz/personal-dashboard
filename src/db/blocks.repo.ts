import { db } from './db';
import type { Block, BlockConfig } from './types';
import { newId, nowIso } from '../lib/id';
import { recordDeletion } from '../lib/deletion-log';

export async function listBlocks(spaceId: string): Promise<Block[]> {
  const blocks = await db.blocks.where('spaceId').equals(spaceId).toArray();
  return blocks.sort((a, b) => a.order - b.order);
}

export async function getBlock(spaceId: string, id: string): Promise<Block | undefined> {
  const block = await db.blocks.get(id);
  if (!block || block.spaceId !== spaceId) return undefined;
  return block;
}

export async function createBlock(block: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>): Promise<Block> {
  const createdAt = nowIso();
  const record: Block = { ...block, id: newId(), createdAt, updatedAt: createdAt };
  await db.blocks.add(record);
  return record;
}

export async function updateBlock(
  spaceId: string,
  id: string,
  patch: Partial<Pick<Block, 'position' | 'visible' | 'config' | 'order'>>,
): Promise<Block> {
  return db.transaction('rw', db.blocks, async () => {
    const existing = await db.blocks.get(id);
    if (!existing || existing.spaceId !== spaceId) throw new Error('Block not found in this space');
    const next: Block = { ...existing, ...patch, updatedAt: nowIso() };
    await db.blocks.put(next);
    return next;
  });
}

export async function deleteBlock(spaceId: string, id: string): Promise<void> {
  const existing = await db.blocks.get(id);
  if (!existing || existing.spaceId !== spaceId) return;
  await db.blocks.delete(id);
  recordDeletion('blocks', id);
}

export async function nextBlockOrder(spaceId: string): Promise<number> {
  const blocks = await listBlocks(spaceId);
  return blocks.length > 0 ? (blocks[blocks.length - 1]?.order ?? 0) + 1 : 0;
}

export async function saveBlockConfig(
  spaceId: string,
  id: string,
  config: BlockConfig,
): Promise<Block> {
  return updateBlock(spaceId, id, { config });
}
