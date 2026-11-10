import { z } from 'zod';

const encryptedSchema = z.object({
  v: z.literal(1),
  iv: z.string().min(1),
  data: z.string().min(1),
});

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function subtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto is unavailable. Sync requires HTTPS.');
  }
  return crypto.subtle;
}

export function generateSyncKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function importKey(key: string): Promise<CryptoKey> {
  return subtle().importKey('raw', base64UrlToBytes(key), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptJson(key: string, value: unknown): Promise<string> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await subtle().encrypt(
    { name: 'AES-GCM', iv },
    await importKey(key),
    plaintext,
  );
  return JSON.stringify({
    v: 1,
    iv: bytesToBase64Url(iv),
    data: bytesToBase64Url(new Uint8Array(cipher)),
  });
}

export async function decryptJson<T>(key: string, text: string): Promise<T> {
  const parsed = encryptedSchema.safeParse(JSON.parse(text) as unknown);
  if (!parsed.success) throw new Error('Invalid encrypted sync payload');

  const plaintext = await subtle().decrypt(
    { name: 'AES-GCM', iv: base64UrlToBytes(parsed.data.iv) },
    await importKey(key),
    base64UrlToBytes(parsed.data.data),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

export function createSyncCode(gistId: string, key: string): string {
  return `pds1.${gistId}.${key}`;
}

export function parseSyncCode(code: string): { gistId: string; key: string } | null {
  const parts = code.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'pds1') return null;
  const [, gistId, key] = parts;
  if (!gistId || !key) return null;
  return { gistId, key };
}
