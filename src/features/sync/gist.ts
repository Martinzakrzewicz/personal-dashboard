import { syncPayloadSchema, type SyncPayload } from './merge';
import { decryptJson, encryptJson } from './crypto';

const API = 'https://api.github.com';
const FILE_NAME = 'dashboard.sync.json';

export type SyncErrorCode = 'token' | 'gist' | 'rate' | 'network' | 'invalid' | 'unknown';

export class SyncError extends Error {
  code: SyncErrorCode;

  constructor(code: SyncErrorCode, message: string) {
    super(message);
    this.name = 'SyncError';
    this.code = code;
  }
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

async function github<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...headers(token), ...(init.headers ?? {}) },
    });
  } catch {
    throw new SyncError('network', 'Could not reach GitHub');
  }

  if (response.status === 401) throw new SyncError('token', 'Token was rejected');
  if (response.status === 403 || response.status === 429) {
    throw new SyncError('rate', 'GitHub API rate limit reached');
  }
  if (response.status === 404) throw new SyncError('gist', 'Sync gist was not found');
  if (!response.ok) {
    throw new SyncError('unknown', `GitHub API error ${response.status}`);
  }
  return (await response.json()) as T;
}

interface GistResponse {
  id: string;
  files: Record<string, { content?: string; truncated?: boolean } | undefined>;
}

export async function validateToken(token: string): Promise<string> {
  const user = await github<{ login: string }>('/user', token);
  return user.login;
}

export async function createGist(token: string, content: string): Promise<string> {
  try {
    const gist = await github<GistResponse>('/gists', token, {
      method: 'POST',
      body: JSON.stringify({
        description: 'Personal Dashboard encrypted sync',
        public: false,
        files: { [FILE_NAME]: { content } },
      }),
    });
    return gist.id;
  } catch (error) {
    // GitHub returns 404 for a token that lacks the gist scope.
    if (error instanceof SyncError && error.code === 'gist') {
      throw new SyncError('token', 'Token cannot create gists');
    }
    throw error;
  }
}

export async function writeGist(token: string, gistId: string, content: string): Promise<void> {
  await github<GistResponse>(`/gists/${encodeURIComponent(gistId)}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [FILE_NAME]: { content } } }),
  });
}

export async function readGist(token: string, gistId: string, key: string): Promise<SyncPayload> {
  const gist = await github<GistResponse>(`/gists/${encodeURIComponent(gistId)}`, token);
  const file = gist.files[FILE_NAME];
  if (!file?.content || file.truncated) {
    throw new SyncError('invalid', 'Sync file is missing or too large');
  }

  try {
    const decrypted = await decryptJson<unknown>(key, file.content);
    const parsed = syncPayloadSchema.safeParse(decrypted);
    if (!parsed.success) throw new Error('Invalid sync payload');
    return parsed.data;
  } catch {
    throw new SyncError('invalid', 'Could not decrypt the sync payload');
  }
}

export async function writeEncryptedPayload(
  config: { token: string; gistId: string; key: string },
  payload: SyncPayload,
): Promise<void> {
  const content = await encryptJson(config.key, payload);
  await writeGist(config.token, config.gistId, content);
}

export async function createEncryptedGist(
  token: string,
  key: string,
  payload: SyncPayload,
): Promise<string> {
  const content = await encryptJson(key, payload);
  return createGist(token, content);
}
