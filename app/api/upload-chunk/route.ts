import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UploadChunkModel } from '@/lib/models/UploadChunk';
import { MediaModel } from '@/lib/models/Media';

export const dynamic = 'force-dynamic';

// Memory cache fallback if MongoDB is not reachable
declare global {
  var __MEDIA_CACHE__: Record<string, { fileName: string; mimeType: string; data: Buffer }> | undefined;
  var __CHUNK_CACHE__: Record<string, Record<number, Buffer>> | undefined;
}

if (!globalThis.__MEDIA_CACHE__) globalThis.__MEDIA_CACHE__ = {};
if (!globalThis.__CHUNK_CACHE__) globalThis.__CHUNK_CACHE__ = {};

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const uploadId = (formData.get('uploadId') as string) || '';
    const chunkIndexStr = (formData.get('chunkIndex') as string) || '0';
    const totalChunksStr = (formData.get('totalChunks') as string) || '1';
    const fileName = (formData.get('fileName') as string) || 'audio.mp3';
    let mimeType = (formData.get('mimeType') as string) || 'audio/mpeg';
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

          const totalBuffers = chunks.map((c) => toBuffer(c.data));
          const completeBuffer = Buffer.concat(totalBuffers);

          // Save assembled file in Media collection
          await MediaModel.findOneAndUpdate(
            { id: uploadId },
            {
              id: uploadId,
              fileName,
              mimeType,
              data: completeBuffer,
              size: completeBuffer.length,
              createdAt: new Date(),
            },
            { upsert: true, new: true }
          );

          // Clean up temporary chunks
          await UploadChunkModel.deleteMany({ uploadId });

          return NextResponse.json({
            success: true,
            completed: true,
            uploadId,
            mediaUrl: `/api/media/${uploadId}`,
          });
        }

        isSavedToMongo = true;
      }
    } catch (dbErr) {
      console.warn('[Chunk Upload] MongoDB save fallback to memory:', dbErr);
    }

    if (!isSavedToMongo) {
      // Memory fallback for local development
      const chunkCache = globalThis.__CHUNK_CACHE__ || (globalThis.__CHUNK_CACHE__ = {});
      const mediaCache = globalThis.__MEDIA_CACHE__ || (globalThis.__MEDIA_CACHE__ = {});

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
        mediaCache[uploadId] = {
          fileName,
          mimeType,
          data: completeBuffer,
        };
        delete chunkCache[uploadId];

        return NextResponse.json({
          success: true,
          completed: true,
          uploadId,
          mediaUrl: `/api/media/${uploadId}`,
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
