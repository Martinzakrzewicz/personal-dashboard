import { db } from './db';
import type { MetaRecord } from './types';

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const record = await db.meta.get(key);
  return record?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export async function deleteMeta(key: string): Promise<void> {
  await db.meta.delete(key);
}

export async function getAllMeta(): Promise<MetaRecord[]> {
  return db.meta.toArray();
}
