import { customAlphabet } from 'nanoid';
import { readShortIdMap, writeShortIdMap } from './fileStorage.js';

// Generate URL-safe alphanumeric IDs (a-z, A-Z, 0-9)
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5);

export async function generateUniqueShortId(): Promise<string> {
  const shortIdMap = await readShortIdMap();
  let shortId: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    shortId = nanoid();
    attempts++;
    
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique short ID after maximum attempts');
    }
  } while (shortIdMap[shortId]);

  return shortId;
}

export async function mapShortIdToVideoId(shortId: string, videoId: string): Promise<void> {
  const shortIdMap = await readShortIdMap();
  shortIdMap[shortId] = videoId;
  await writeShortIdMap(shortIdMap);
}

export async function getVideoIdFromShortId(shortId: string): Promise<string | null> {
  const shortIdMap = await readShortIdMap();
  return shortIdMap[shortId] || null;
}

export async function deleteShortIdMapping(shortId: string): Promise<void> {
  const shortIdMap = await readShortIdMap();
  delete shortIdMap[shortId];
  await writeShortIdMap(shortIdMap);
}

