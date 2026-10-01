import fs from 'fs';
import path from 'path';
import os from 'os';
import { SurpriseData } from '@/types/ecard';
import { connectToDatabase } from './mongodb';
import { SurpriseModel } from './models/Surprise';

// Global memory cache for fallback environments
declare global {
  var __ECARD_CACHE__: Record<string, SurpriseData> | undefined;
}

if (!globalThis.__ECARD_CACHE__) {
  globalThis.__ECARD_CACHE__ = {};
}

function getStoragePath(): string {
  const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  if (isServerless) {
    const tmpDir = path.join(os.tmpdir(), 'ecard_data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (e) { }
    return path.join(tmpDir, 'surprises.json');
  }

  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
  } catch (e) { }
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
  } catch (err) { }
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
    saveLocalSurprises(active);
  }

  return active;
}

function getLocalSurprises(): Record<string, SurpriseData> {
  let result: Record<string, SurpriseData> = { ...(globalThis.__ECARD_CACHE__ || {}) };
  const filePath = getStoragePath();

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      result = { ...result, ...parsed };
    }
  } catch (err) { }

  const cleaned = cleanupExpiredSurprises(result);
  globalThis.__ECARD_CACHE__ = cleaned;
  return cleaned;
}

function saveLocalSurprises(data: Record<string, SurpriseData>) {
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

/**
 * Save a surprise to MongoDB Atlas (or fallback to local file)
 */
export async function saveSurprise(record: SurpriseData): Promise<void> {
  if (!record.id) return;

  try {
    const db = await connectToDatabase();
    if (db) {
      await SurpriseModel.findOneAndUpdate(
        { id: record.id },
        {
          ...record,
          createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
        },
        { upsert: true, new: true }
      );
      console.log(`[MongoDB] Saved E-Card ${record.id} to MongoDB Atlas`);
      return;
    }
  } catch (err) {
    console.warn('[Storage] MongoDB save failed, saving to local fallback:', err);
  }

  // Local fallback
  const surprises = getLocalSurprises();
  surprises[record.id] = record;
  saveLocalSurprises(surprises);
}

/**
 * Fetch a single surprise by ID from MongoDB Atlas (or fallback to local file)
 */
export async function getSurpriseById(id: string): Promise<SurpriseData | null> {
  try {
    const db = await connectToDatabase();
    if (db) {
      const doc = await SurpriseModel.findOne({ id }).lean();
      if (doc) {
        const item: SurpriseData = {
          ...doc,
          createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : (doc.createdAt as string),
        };

        const now = Date.now();
        let isExpired = false;
        if (item.expiresAt) {
          isExpired = new Date(item.expiresAt).getTime() <= now;
        } else if (item.createdAt) {
          isExpired = new Date(item.createdAt).getTime() + 24 * 60 * 60 * 1000 <= now;
        }

        if (isExpired) {
          return { ...item, isExpired: true };
        }
        return item;
      }
    }
  } catch (err) {
    console.warn('[Storage] MongoDB fetch error, falling back to local:', err);
  }

  // Local fallback
  const surprises = getLocalSurprises();
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

/**
 * Fetch all active surprises from MongoDB Atlas (or fallback)
 */
export async function getSurprises(): Promise<Record<string, SurpriseData>> {
  try {
    const db = await connectToDatabase();
    if (db) {
      const docs = await SurpriseModel.find().lean();
      const result: Record<string, SurpriseData> = {};
      for (const d of docs) {
        result[d.id] = {
          ...d,
          createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : (d.createdAt as string),
        };
      }
      return result;
    }
  } catch (err) {
    console.warn('[Storage] MongoDB getSurprises error, falling back to local:', err);
  }

  return getLocalSurprises();
}

/**
 * Utility to process uploaded files into serverless-safe Data URLs
 */
export async function saveUploadedFile(
  sid: string,
  file: File,
  prefix: string = 'file'
): Promise<string> {
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
    else if (ext === '.webm' || ext === '.weba') mimeType = 'audio/webm';
    else if (ext === '.wav') mimeType = 'audio/wav';
    else if (ext === '.ogg' || ext === '.opus') mimeType = 'audio/ogg';
    else if (ext === '.m4a' || ext === '.m4r' || ext === '.aac') mimeType = 'audio/mp4';
    else if (ext === '.flac') mimeType = 'audio/flac';
    else if (ext === '.caf') mimeType = 'audio/x-caf';
    else if (ext === '.aiff' || ext === '.aif') mimeType = 'audio/aiff';
    else if (ext === '.wma') mimeType = 'audio/x-ms-wma';
    else if (prefix === 'song' || prefix === 'voice') mimeType = 'audio/mpeg';
    else mimeType = 'image/jpeg';
  }

  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
