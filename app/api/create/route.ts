import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { saveSurprise, saveUploadedFile } from '@/lib/storage';
import { saveMedia } from '@/lib/media-storage';
import { SurpriseData } from '@/types/ecard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const sid = crypto.randomUUID();

    const sender = (formData.get('sender') as string) || '';
    const receiver = (formData.get('receiver') as string) || '';
    const message = (formData.get('message') as string) || '';
    const eventType = (formData.get('eventType') as string) || 'boyfriend';
    const eventTitle = (formData.get('eventTitle') as string) || '';
    const vibe = (formData.get('vibe') as string) || 'romantic';
    const envelopeLetterTitle = (formData.get('envelopeLetterTitle') as string) || '';
    const envelopeLetterSub = (formData.get('envelopeLetterSub') as string) || '';
    const envelopeStamp = (formData.get('envelopeStamp') as string) || '';
    const certificateBadge = (formData.get('certificateBadge') as string) || '';
    const certificateTitle = (formData.get('certificateTitle') as string) || '';
    const certificateSigner = (formData.get('certificateSigner') as string) || '';
    const witnessType = (formData.get('witnessType') as string) || 'cat';
    const witnessName = (formData.get('witnessName') as string) || '';
    const songTitle = (formData.get('songTitle') as string) || '';
    const voiceNoteTitle = (formData.get('voiceNoteTitle') as string) || '';
    const secretQuestion = (formData.get('secretQuestion') as string) || '';
    const secretAnswer = (formData.get('secretAnswer') as string) || '';
    const secretHint = (formData.get('secretHint') as string) || '';
    const payment_id = (formData.get('payment_id') as string) || `LOCAL-${Date.now()}`;

    if (!sender.trim() || !receiver.trim()) {
      return NextResponse.json(
        { error: 'Sender and receiver names are required.' },
        { status: 400 }
      );
    }

    // Process Certificate Terms
    let parsedTerms: string[] | undefined = undefined;
    const rawTerms = formData.get('certificateTerms');
    if (rawTerms) {
      try {
        parsedTerms = JSON.parse(rawTerms as string);
      } catch (e) {
        parsedTerms = [rawTerms as string];
      }
    }

    // Process Memory Notes
    let parsedMemories: string[] | undefined = undefined;
    const rawMemories = formData.get('memoryNotes');
    if (rawMemories) {
      try {
        parsedMemories = JSON.parse(rawMemories as string);
      } catch (e) {
        parsedMemories = [rawMemories as string];
      }
    }

    // Process Scratch Coupons
    let parsedCoupons: string[] | undefined = undefined;
    const rawCoupons = formData.get('scratchCoupons');
    if (rawCoupons) {
      try {
        parsedCoupons = JSON.parse(rawCoupons as string);
      } catch (e) {
        parsedCoupons = [rawCoupons as string];
      }
    }

    // Process Theme Colors
    let parsedTheme = null;
    const rawTheme = formData.get('themeColors');
    if (rawTheme) {
      try {
        parsedTheme = JSON.parse(rawTheme as string);
      } catch (e) {
        parsedTheme = null;
      }
    }

    // Save uploaded Photos (up to 3)
    const photoUrls: string[] = [];
    const photoFiles = formData.getAll('photos') as File[];
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      if (file && file.size > 0) {
        const url = await saveUploadedFile(sid, file, `photo-${i + 1}`);
        photoUrls.push(url);
      }
    }

    // Process Wall Photos (Library or uploaded)
    const wallPhotoFiles = formData.getAll('wallPhotos') as File[];
    const rawWallConfig = formData.get('wallPhotosConfig');
    let parsedWallConfig: string[] | null = null;
    if (rawWallConfig) {
      try {
        parsedWallConfig = JSON.parse(rawWallConfig as string);
      } catch (e) {
        parsedWallConfig = null;
      }
    }

    let finalWallPhotos: string[] = [];
    let wallUploadIdx = 0;
    if (Array.isArray(parsedWallConfig) && parsedWallConfig.length === 6) {
      for (let idx = 0; idx < parsedWallConfig.length; idx++) {
        const item = parsedWallConfig[idx];
        if (typeof item === 'string' && item.startsWith('upload:')) {
          if (wallPhotoFiles[wallUploadIdx] && wallPhotoFiles[wallUploadIdx].size > 0) {
            const f = wallPhotoFiles[wallUploadIdx++];
            const savedUrl = await saveUploadedFile(sid, f, `wall-${idx + 1}`);
            finalWallPhotos.push(savedUrl);
          } else {
            finalWallPhotos.push(`/library/viral_${idx + 1}.jpg`);
          }
        } else if (typeof item === 'string' && item.trim()) {
          const trimmed = item.trim();
          finalWallPhotos.push(trimmed.startsWith('/') || trimmed.startsWith('http') ? trimmed : `/${trimmed}`);
        } else {
          finalWallPhotos.push(`/library/viral_${idx + 1}.jpg`);
        }
      }
    } else {
      finalWallPhotos = [1, 2, 3, 4, 5, 6].map((i) => `/library/viral_${i}.jpg`);
    }

    // Process Custom Song (Chunk-uploaded URL or direct file)
    let customSongUrl = (formData.get('songUrl') as string) || '';
    let customSongTitle = songTitle;
    const songFile = formData.get('song') as File | null;
    if (!customSongUrl && songFile && songFile.size > 0) {
      const songMediaId = crypto.randomUUID();
      const songBuffer = Buffer.from(await songFile.arrayBuffer());
      let mimeType = songFile.type || 'audio/mpeg';
      if (mimeType === 'audio/mp3') mimeType = 'audio/mpeg';
      customSongUrl = await saveMedia(songMediaId, songFile.name, mimeType, songBuffer);
      if (!customSongTitle) {
        customSongTitle = songFile.name.replace(/\.[^/.]+$/, '');
      }
    }

    // Process Voice Note (Chunk-uploaded URL or direct file)
    let voiceNoteUrl: string | null = (formData.get('voiceNoteUrl') as string) || null;
    const voiceFile = formData.get('voiceNote') as File | null;
    if (!voiceNoteUrl && voiceFile && voiceFile.size > 0) {
      const voiceMediaId = crypto.randomUUID();
      const voiceBuffer = Buffer.from(await voiceFile.arrayBuffer());
      let mimeType = voiceFile.type || 'audio/webm';
      voiceNoteUrl = await saveMedia(voiceMediaId, 'voice-note.webm', mimeType, voiceBuffer);
    }

    // Process Witness Photo
    let witnessPhotoUrl: string | null = null;
    const witnessFile = formData.get('witnessPhoto') as File | null;
    if (witnessFile && witnessFile.size > 0) {
      witnessPhotoUrl = await saveUploadedFile(sid, witnessFile, 'witness');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const newRecord: SurpriseData = {
      id: sid,
      eventType: eventType || 'boyfriend',
      eventTitle: eventTitle || '',
      envelopeStamp: envelopeStamp || '',
      envelopeLetterTitle: envelopeLetterTitle || '',
      envelopeLetterSub: envelopeLetterSub || '',
      certificateBadge: certificateBadge || '',
      certificateTitle: certificateTitle || '',
      certificateTerms: parsedTerms,
      certificateSigner: certificateSigner || '',
      memoryNotes: parsedMemories,
      themeColors: parsedTheme,
      musicUrl: customSongUrl || '/song.mp3',
      songTitle: customSongTitle || 'Our Song',
      secretQuestion: secretQuestion.trim(),
      secretAnswer: secretAnswer.trim(),
      secretHint: secretHint.trim(),
      vibe: vibe || 'romantic',
      scratchCoupons: parsedCoupons,
      witnessType: witnessType || 'cat',
      witnessName: witnessName.trim(),
      witnessPhotoUrl,
      voiceNoteUrl,
      voiceNoteTitle: voiceNoteTitle.trim() || 'A special voice note for you',
      sender: sender.trim(),
      receiver: receiver.trim(),
      message: message.trim(),
      photos: photoUrls,
      wallPhotos: finalWallPhotos,
      payment_id: payment_id || `FREE-${Date.now()}`,
      createdAt: now.toISOString(),
      expiresAt: expiresAt,
    };

    await saveSurprise(newRecord);

    console.log(`[Next.js API] Created E-Card ${sid} for ${newRecord.receiver} from ${newRecord.sender} (Expires: ${expiresAt})`);

    return NextResponse.json({
      success: true,
      id: sid,
      shareUrl: `/?id=${sid}`,
      expiresAt: expiresAt,
      data: newRecord,
    });
  } catch (err: any) {
    console.error('Error creating surprise:', err);
    return NextResponse.json(
      { error: 'Failed to create surprise: ' + (err?.message || err) },
      { status: 500 }
    );
  }
}
