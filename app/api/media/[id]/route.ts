import { NextRequest, NextResponse } from 'next/server';
import { getMedia } from '@/lib/media-storage';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams?.id;

    if (!id) {
      return new NextResponse('Media ID is required', { status: 400 });
    }

    const mediaData = await getMedia(id);

    if (!mediaData || !mediaData.data || mediaData.data.length === 0) {
      return new NextResponse('Media not found or expired', { status: 404 });
    }

    const buffer = mediaData.data;
    const totalSize = buffer.length;
    let mimeType = mediaData.mimeType || 'audio/mpeg';
    if (mimeType === 'audio/mp3') mimeType = 'audio/mpeg';

    const rangeHeader = req.headers.get('range');

    if (rangeHeader) {
      // Support HTTP byte-range requests for iOS Safari and mobile Chrome streaming/seeking
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (isNaN(start) || start >= totalSize || end >= totalSize || start > end) {
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
          'Content-Type': mimeType,
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
        'Content-Type': mimeType,
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
