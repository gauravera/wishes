import fs from 'fs';
import path from 'path';
import os from 'os';
import { SurpriseData } from '@/types/ecard';

// Global memory cache for serverless environments (Vercel)
declare global {
  var __ECARD_CACHE__: Record<string, SurpriseData> | undefined;
}

if (!globalThis.__ECARD_CACHE__) {
  globalThis.__ECARD_CACHE__ = {};
}

function getStoragePath(): string {
  // On Vercel / serverless, process.cwd() is read-only (/var/task)
  // Use os.tmpdir() (/tmp) which is always writable
  const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  if (isServerless) {
    const tmpDir = path.join(os.tmpdir(), 'ecard_data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (e) {
      // Ignore
    }
    return path.join(tmpDir, 'surprises.json');
  }

  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
  } catch (e) {}
  return path.join(localDir, 'surprises.json');
}

export function ensureDirectories() {
  try {
    const filePath = getStoragePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf8');
    }
  } catch (err) {
    // Non-critical in serverless environments
  }
}

export function cleanupExpiredSurprises(surprises: Record<string, SurpriseData>): Record<string, SurpriseData> {
  const now = Date.now();
  const active: Record<string, SurpriseData> = {};
  let changed = false;

  for (const [sid, item] of Object.entries(surprises)) {
    let isExpired = false;
    if (item.expiresAt) {
      isExpired = new Date(item.expiresAt).getTime() <= now;
    } else if (item.createdAt) {
      // Default 24 hours (86,400,000 ms) from creation
      isExpired = new Date(item.createdAt).getTime() + 24 * 60 * 60 * 1000 <= now;
    }

    if (isExpired) {
      changed = true;
      console.log(`[Storage] E-Card ${sid} expired after 24 hours. Pruned.`);
    } else {
      active[sid] = item;
    }
  }

  if (changed) {
    saveSurprises(active);
  }

  return active;
}

export function getSurprises(): Record<string, SurpriseData> {
  let result: Record<string, SurpriseData> = { ...(globalThis.__ECARD_CACHE__ || {}) };
  const filePath = getStoragePath();

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      result = { ...result, ...parsed };
    }
  } catch (err) {
    // Fall back to memory cache
  }

  const cleaned = cleanupExpiredSurprises(result);
  globalThis.__ECARD_CACHE__ = cleaned;
  return cleaned;
}

export function saveSurprises(data: Record<string, SurpriseData>) {
  globalThis.__ECARD_CACHE__ = data;
  const filePath = getStoragePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Storage] Could not write to disk, using in-memory cache:', err);
  }
}

export function getSurpriseById(id: string): SurpriseData | null {
  const surprises = getSurprises();
  const item = surprises[id] || (globalThis.__ECARD_CACHE__ ? globalThis.__ECARD_CACHE__[id] : null);
  if (!item) return null;

  const now = Date.now();
  let isExpired = false;
  if (item.expiresAt) {
    isExpired = new Date(item.expiresAt).getTime() <= now;
  } else if (item.createdAt) {
    isExpired = new Date(item.createdAt).getTime() + 24 * 60 * 60 * 1000 <= now;
  }

  if (isExpired) {
    cleanupExpiredSurprises(surprises);
    return { ...item, isExpired: true };
  }

  return item;
}

export async function saveUploadedFile(
  sid: string,
  file: File,
  prefix: string = 'file'
): Promise<string> {
  // Convert uploaded file to Base64 Data URL so it is 100% serverless-safe (Vercel)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const ext = (path.extname(file.name) || '').toLowerCase();
  let mimeType = file.type;
  if (!mimeType || mimeType === 'application/octet-stream') {
    if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.mp3') mimeType = 'audio/mpeg';
    else if (ext === '.webm') mimeType = 'audio/webm';
    else if (ext === '.wav') mimeType = 'audio/wav';
    else if (ext === '.ogg') mimeType = 'audio/ogg';
    else if (ext === '.m4a') mimeType = 'audio/mp4';
    else mimeType = 'image/jpeg';
  }

  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
