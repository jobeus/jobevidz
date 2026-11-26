// Personal API keys, for things like the iOS share shortcut. A key looks like vz_<32 random
// characters>; only its SHA-256 hash is stored (on the user record), so a key is shown once
// when created and can't be recovered, only revoked. A key can do what its owner can do in
// the video API, but can't manage keys (that needs a signed-in session).
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { readUsers, writeUsers } from './fileStorage.js';
import type { User } from '../types/index.js';

export const API_KEY_PREFIX = 'vz_';

export interface StoredApiKey {
  id: string;
  name: string;
  /** sha256 of the full key, hex */
  hash: string;
  /** first and last characters, to tell keys apart in the list */
  hint: string;
  createdAt: string;
  lastUsedAt?: string;
}

/** What the API shows of a key. */
export type ApiKeyInfo = Omit<StoredApiKey, 'hash'>;

const hashKey = (key: string) => crypto.createHash('sha256').update(key).digest('hex');
const info = ({ hash: _secret, ...rest }: StoredApiKey): ApiKeyInfo => rest;

export function isApiKey(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
}

export async function listApiKeys(userId: string): Promise<ApiKeyInfo[]> {
  const user = (await readUsers()).find((u: User) => u.id === userId);
  return ((user?.apiKeys as StoredApiKey[] | undefined) || []).map(info);
}

/** Creates a key and returns it in full: the only time it is ever available. */
export async function createApiKey(userId: string, name: string): Promise<{ key: string; info: ApiKeyInfo }> {
  const users = await readUsers();
  const user = users.find((u: User) => u.id === userId);
  if (!user) throw new Error('User not found');
  const key = `${API_KEY_PREFIX}${crypto.randomBytes(24).toString('base64url')}`;
  const stored: StoredApiKey = {
    id: nanoid(10),
    name: name.trim().slice(0, 60) || 'API key',
    hash: hashKey(key),
    hint: `${key.slice(0, 6)}…${key.slice(-4)}`,
    createdAt: new Date().toISOString(),
  };
  user.apiKeys = [...((user.apiKeys as StoredApiKey[] | undefined) || []), stored];
  await writeUsers(users);
  return { key, info: info(stored) };
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const users = await readUsers();
  const user = users.find((u: User) => u.id === userId);
  const keys = (user?.apiKeys as StoredApiKey[] | undefined) || [];
  if (!user || !keys.some((k) => k.id === keyId)) return false;
  user.apiKeys = keys.filter((k) => k.id !== keyId);
  await writeUsers(users);
  return true;
}

/** The user a key belongs to, or null. Records when it was last used (at most once a minute). */
export async function userForApiKey(key: string): Promise<{ userId: string; username: string } | null> {
  const hash = hashKey(key);
  const users = await readUsers();
  for (const user of users as User[]) {
    const stored = ((user.apiKeys as StoredApiKey[] | undefined) || []).find((k) =>
      crypto.timingSafeEqual(Buffer.from(k.hash, 'hex'), Buffer.from(hash, 'hex')),
    );
    if (!stored) continue;
    const now = Date.now();
    if (!stored.lastUsedAt || now - Date.parse(stored.lastUsedAt) > 60_000) {
      stored.lastUsedAt = new Date(now).toISOString();
      await writeUsers(users);
    }
    return { userId: user.id, username: user.username };
  }
  return null;
}
