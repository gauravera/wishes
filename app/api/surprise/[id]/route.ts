import { NextRequest, NextResponse } from 'next/server';
import { getSurpriseById } from '@/lib/storage';
import { saveMedia } from '@/lib/media-storage';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const record = await getSurpriseById(id);
    if (!record) {
      return NextResponse.json({ error: 'Surprise not found or has expired.' }, { status: 404 });
    }
    if (record.isExpired) {
      return NextResponse.json(
        { error: 'This e-card was valid for 24 hours and has now expired.', expired: true },
        { status: 410 }
      );
    }

    // Migration: If musicUrl was saved as an inline Base64 data URI, convert it to streamable /api/media URL
    // so mobile Safari and Chrome can stream and seek it via HTTP range requests without failing.
    if (record.musicUrl && record.musicUrl.startsWith('data:audio/')) {
      try {
        const matches = record.musicUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const mediaId = `converted_${record.id}_song`;
          const newUrl = await saveMedia(mediaId, 'audio.mp3', mimeType, buffer);
          record.musicUrl = newUrl;
        }
      } catch (err) {
        console.warn('[Surprise GET] Failed to convert base64 song to media URL:', err);
      }
    }

    if (record.voiceNoteUrl && record.voiceNoteUrl.startsWith('data:audio/')) {
      try {
        const matches = record.voiceNoteUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const mediaId = `converted_${record.id}_voice`;
          const newUrl = await saveMedia(mediaId, 'voice-note.webm', mimeType, buffer);
          record.voiceNoteUrl = newUrl;
        }
      } catch (err) {
        console.warn('[Surprise GET] Failed to convert base64 voice note to media URL:', err);
      }
    }

    return NextResponse.json(record);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch surprise: ' + err.message },
      { status: 500 }
    );
  }
}
