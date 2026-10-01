import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { MediaModel } from '@/lib/models/Media';

export const dynamic = 'force-dynamic';

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
          mediaData = {
            fileName: doc.fileName || 'audio.mp3',
            mimeType: doc.mimeType || 'audio/mpeg',
            data: Buffer.from(doc.data),
          };
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
