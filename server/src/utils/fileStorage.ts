import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../../data');
const UPLOAD_DIR = path.join(__dirname, '../../../uploads');
const VIDEOS_DIR = path.join(UPLOAD_DIR, 'videos');
const METADATA_DIR = path.join(UPLOAD_DIR, 'metadata');
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Ensure directories exist
export async function initializeDirectories(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(VIDEOS_DIR, { recursive: true });
  await fs.mkdir(METADATA_DIR, { recursive: true });
  await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
}

// User storage functions
export async function readUsers(): Promise<any[]> {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'users.json'), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function writeUsers(users: any[]): Promise<void> {
  await fs.writeFile(
    path.join(DATA_DIR, 'users.json'),
    JSON.stringify(users, null, 2),
    'utf-8'
  );
}

// Video metadata storage functions
export async function readVideoMetadata(videoId: string): Promise<any | null> {
  try {
    const data = await fs.readFile(
      path.join(METADATA_DIR, `${videoId}.json`),
      'utf-8'
    );
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

export async function writeVideoMetadata(videoId: string, metadata: any): Promise<void> {
  await fs.writeFile(
    path.join(METADATA_DIR, `${videoId}.json`),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );
}

export async function deleteVideoMetadata(videoId: string): Promise<void> {
  await fs.unlink(path.join(METADATA_DIR, `${videoId}.json`));
}

// Short ID mapping storage
export async function readShortIdMap(): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'shortids.json'), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

export async function writeShortIdMap(map: Record<string, string>): Promise<void> {
  await fs.writeFile(
    path.join(DATA_DIR, 'shortids.json'),
    JSON.stringify(map, null, 2),
    'utf-8'
  );
}

// Get all video metadata files
export async function getAllVideoMetadata(): Promise<any[]> {
  try {
    const files = await fs.readdir(METADATA_DIR);
    const metadataFiles = files.filter(f => f.endsWith('.json'));
    
    const metadata = await Promise.all(
      metadataFiles.map(async (file) => {
        const videoId = file.replace('.json', '');
        return readVideoMetadata(videoId);
      })
    );
    
    return metadata.filter(m => m !== null);
  } catch (error) {
    return [];
  }
}

// Get video file path
export function getVideoPath(filename: string): string {
  return path.join(VIDEOS_DIR, filename);
}

// Get thumbnail file path
export function getThumbnailPath(filename: string): string {
  return path.join(THUMBNAILS_DIR, filename);
}

// Delete video file
export async function deleteVideoFile(filename: string): Promise<void> {
  await fs.unlink(getVideoPath(filename));
}

// Delete thumbnail file
export async function deleteThumbnailFile(filename: string): Promise<void> {
  try {
    await fs.unlink(getThumbnailPath(filename));
  } catch (error) {
    // Ignore errors if thumbnail doesn't exist
  }
}

