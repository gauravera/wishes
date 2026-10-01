import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { MediaModel } from '@/lib/models/Media';

export const dynamic = 'force-dynamic';

function toBuffer(data: any): Buffer {
  if (!data) return Buffer.alloc(0);
  if (Buffer.isBuffer(data)) return data;
  if (data.buffer && Buffer.isBuffer(data.buffer)) return data.buffer;
  if (data.buffer instanceof ArrayBuffer) return Buffer.from(data.buffer);
  if (typeof data.value === 'function') {
    const val = data.value(true);
    if (Buffer.isBuffer(val)) return val;
    if (val instanceof Uint8Array || val instanceof ArrayBuffer) return Buffer.from(val as any);
  }
  if (data._bsontype === 'Binary' && data.sub_type !== undefined) {
    if (data.buffer) return Buffer.from(data.buffer as any);
  }
  if (data instanceof Uint8Array || data instanceof ArrayBuffer) return Buffer.from(data as any);
  return Buffer.from(String(data));
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return new NextResponse('Media ID is required', { status: 400 });
    }

    let mediaData: { fileName: string; mimeType: string; data: Buffer } | null = null;

    try {
      const db = await connectToDatabase();
      if (db) {
        const doc = await MediaModel.findOne({ id }).lean();
        if (doc && doc.data) {
          const rawBuf = toBuffer(doc.data);
          if (rawBuf.length > 0) {
            mediaData = {
              fileName: doc.fileName || 'audio.mp3',
              mimeType: doc.mimeType || 'audio/mpeg',
              data: rawBuf,
            };
          }
        }
      }
    } catch (dbErr) {
      console.warn('[Media GET] Database fetch error:', dbErr);
    }

    if (!mediaData && globalThis.__MEDIA_CACHE__ && globalThis.__MEDIA_CACHE__[id]) {
      mediaData = globalThis.__MEDIA_CACHE__[id];
    }

    if (!mediaData) {
      return new NextResponse('Media not found or expired', { status: 404 });
    }

    const buffer = mediaData.data;
    const totalSize = buffer.length;
    const rangeHeader = req.headers.get('range');

    if (rangeHeader) {
      // Support HTTP range requests for smooth seeking and iOS Safari playback
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${totalSize}`,
          },
        });
      }

      const chunk = buffer.subarray(start, end + 1);
      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          'Content-Type': mediaData.mimeType,
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunk.length.toString(),
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mediaData.mimeType,
        'Content-Length': totalSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (err: any) {
    console.error('Error streaming media:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
