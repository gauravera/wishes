import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UploadChunkModel } from '@/lib/models/UploadChunk';
import { saveMedia, toBuffer } from '@/lib/media-storage';

export const dynamic = 'force-dynamic';

// Memory cache fallback if MongoDB is not reachable
declare global {
  var __CHUNK_CACHE__: Record<string, Record<number, Buffer>> | undefined;
}

if (!globalThis.__CHUNK_CACHE__) globalThis.__CHUNK_CACHE__ = {};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const uploadId = (formData.get('uploadId') as string) || '';
    const chunkIndexStr = (formData.get('chunkIndex') as string) || '0';
    const totalChunksStr = (formData.get('totalChunks') as string) || '1';
    const fileName = (formData.get('fileName') as string) || 'audio.mp3';
    let mimeType = (formData.get('mimeType') as string) || 'audio/mpeg';
    if (mimeType === 'audio/mp3') mimeType = 'audio/mpeg';
    const chunkFile = formData.get('chunk') as File | null;

    if (!uploadId || !chunkFile) {
      return NextResponse.json(
        { error: 'Missing uploadId or chunk data' },
        { status: 400 }
      );
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    const totalChunks = parseInt(totalChunksStr, 10);

    const arrayBuffer = await chunkFile.arrayBuffer();
    const chunkBuffer = Buffer.from(arrayBuffer);

    let isSavedToMongo = false;

    try {
      const db = await connectToDatabase();
      if (db) {
        // Upsert chunk in MongoDB
        await UploadChunkModel.findOneAndUpdate(
          { uploadId, chunkIndex },
          { uploadId, chunkIndex, totalChunks, data: chunkBuffer, createdAt: new Date() },
          { upsert: true, new: true }
        );

        // Check if all chunks have arrived
        const count = await UploadChunkModel.countDocuments({ uploadId });
        if (count >= totalChunks) {
          const chunks = await UploadChunkModel.find({ uploadId })
            .sort({ chunkIndex: 1 })
            .lean();

          if (chunks.length >= totalChunks) {
            // Convert each chunk safely using toBuffer to prevent BSON Binary TypeError
            const totalBuffers = chunks.map((c) => toBuffer(c.data));
            const completeBuffer = Buffer.concat(totalBuffers);

            // Save assembled file via universal saveMedia (MongoDB + Disk + Memory)
            const mediaUrl = await saveMedia(uploadId, fileName, mimeType, completeBuffer);

            // Clean up temporary chunks in background
            UploadChunkModel.deleteMany({ uploadId }).catch(() => {});

            return NextResponse.json({
              success: true,
              completed: true,
              uploadId,
              mediaUrl,
            });
          }
        }

        isSavedToMongo = true;
      }
    } catch (dbErr) {
      console.warn('[Chunk Upload] MongoDB save fallback to memory:', dbErr);
    }

    if (!isSavedToMongo) {
      // Memory / local fallback
      const chunkCache = globalThis.__CHUNK_CACHE__ || (globalThis.__CHUNK_CACHE__ = {});

      if (!chunkCache[uploadId]) {
        chunkCache[uploadId] = {};
      }
      chunkCache[uploadId][chunkIndex] = chunkBuffer;

      const receivedIndices = Object.keys(chunkCache[uploadId]).map(Number);
      if (receivedIndices.length >= totalChunks) {
        const buffers: Buffer[] = [];
        for (let i = 0; i < totalChunks; i++) {
          buffers.push(chunkCache[uploadId][i] || Buffer.alloc(0));
        }
        const completeBuffer = Buffer.concat(buffers);
        delete chunkCache[uploadId];

        const mediaUrl = await saveMedia(uploadId, fileName, mimeType, completeBuffer);

        return NextResponse.json({
          success: true,
          completed: true,
          uploadId,
          mediaUrl,
        });
      }
    }

    return NextResponse.json({
      success: true,
      completed: false,
      uploadId,
      chunkIndex,
      totalChunks,
    });
  } catch (err: any) {
    console.error('Error processing upload chunk:', err);
    return NextResponse.json(
      { error: 'Failed to process chunk: ' + (err?.message || err) },
      { status: 500 }
    );
  }
}
