import fs from 'fs';
import path from 'path';
import os from 'os';
import { connectToDatabase } from './mongodb';
import { MediaModel } from './models/Media';

declare global {
  var __MEDIA_CACHE__: Record<string, { fileName: string; mimeType: string; data: Buffer }> | undefined;
}

if (!globalThis.__MEDIA_CACHE__) {
  globalThis.__MEDIA_CACHE__ = {};
}

/**
 * Universal BSON Binary / ArrayBuffer / Uint8Array to Node.js Buffer converter.
 * Fixes critical Mongoose .lean() issue where binary fields are BSON Binary objects,
 * which cause Buffer.from() to throw a TypeError in Node.js.
 */
export function toBuffer(data: any): Buffer {
  if (!data) return Buffer.alloc(0);
  if (Buffer.isBuffer(data)) return data;
  if (data.buffer && Buffer.isBuffer(data.buffer)) return data.buffer;
  if (data.buffer && data.buffer instanceof ArrayBuffer) return Buffer.from(data.buffer);
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (typeof data.value === 'function') return data.value(true);
  return Buffer.from(data);
}

function getMediaDir(): string {
  const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  const baseDir = isServerless
    ? path.join(os.tmpdir(), 'ecard_data', 'media')
    : path.join(process.cwd(), 'data', 'media');
  try {
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
  } catch (e) {}
  return baseDir;
}

/**
 * Save an audio media file across all layers:
 * 1. In-memory cache
 * 2. Persistent disk storage
 * 3. MongoDB Atlas (Media collection)
 */
export async function saveMedia(
  id: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  let normalizedMime = mimeType || 'audio/mpeg';
  if (normalizedMime === 'audio/mp3') normalizedMime = 'audio/mpeg';

  // 1. In-memory cache
  if (!globalThis.__MEDIA_CACHE__) globalThis.__MEDIA_CACHE__ = {};
  globalThis.__MEDIA_CACHE__[id] = {
    fileName,
    mimeType: normalizedMime,
    data: buffer,
  };

  // 2. Persistent disk storage
  try {
    const dir = getMediaDir();
    const filePath = path.join(dir, `${id}.bin`);
    const metaPath = path.join(dir, `${id}.meta.json`);
    fs.writeFileSync(filePath, buffer);
    fs.writeFileSync(
      metaPath,
      JSON.stringify({ fileName, mimeType: normalizedMime, size: buffer.length }),
      'utf8'
    );
  } catch (err) {
    console.warn('[MediaStorage] Disk save error:', err);
  }

  // 3. MongoDB Atlas
  try {
    const db = await connectToDatabase();
    if (db) {
      await MediaModel.findOneAndUpdate(
        { id },
        {
          id,
          fileName,
          mimeType: normalizedMime,
          data: buffer,
          size: buffer.length,
          createdAt: new Date(),
        },
        { upsert: true, new: true }
      );
      console.log(`[MediaStorage] Saved media ${id} (${fileName}, ${buffer.length} bytes) to MongoDB Atlas`);
    }
  } catch (dbErr) {
    console.warn('[MediaStorage] MongoDB save error:', dbErr);
  }

  return `/api/media/${id}`;
}

/**
 * Retrieve media file from MongoDB -> in-memory cache -> disk
 */
export async function getMedia(
  id: string
): Promise<{ fileName: string; mimeType: string; data: Buffer } | null> {
  // 1. MongoDB Atlas
  try {
    const db = await connectToDatabase();
    if (db) {
      const doc = await MediaModel.findOne({ id }).lean();
      if (doc && doc.data) {
        const buf = toBuffer(doc.data);
        if (buf.length > 0) {
          let normalizedMime = doc.mimeType || 'audio/mpeg';
          if (normalizedMime === 'audio/mp3') normalizedMime = 'audio/mpeg';
          return {
            fileName: doc.fileName || 'audio.mp3',
            mimeType: normalizedMime,
            data: buf,
          };
        }
      }
    }
  } catch (dbErr) {
    console.warn('[MediaStorage] MongoDB fetch error:', dbErr);
  }

  // 2. In-memory cache
  if (globalThis.__MEDIA_CACHE__ && globalThis.__MEDIA_CACHE__[id]) {
    return globalThis.__MEDIA_CACHE__[id];
  }

  // 3. Disk storage
  try {
    const dir = getMediaDir();
    const filePath = path.join(dir, `${id}.bin`);
    const metaPath = path.join(dir, `${id}.meta.json`);
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      let meta = { fileName: 'audio.mp3', mimeType: 'audio/mpeg' };
      if (fs.existsSync(metaPath)) {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      }
      let normalizedMime = meta.mimeType || 'audio/mpeg';
      if (normalizedMime === 'audio/mp3') normalizedMime = 'audio/mpeg';
      return {
        fileName: meta.fileName,
        mimeType: normalizedMime,
        data: buf,
      };
    }
  } catch (diskErr) {
    console.warn('[MediaStorage] Disk read error:', diskErr);
  }

  return null;
}
