import mongoose, { Schema, Model } from 'mongoose';

export interface IUploadChunk {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  data: Buffer;
  createdAt: Date;
}

const UploadChunkSchema = new Schema<IUploadChunk>(
  {
    uploadId: { type: String, required: true, index: true },
    chunkIndex: { type: Number, required: true },
    totalChunks: { type: Number, required: true },
    data: { type: Buffer, required: true },
    // 2-hour TTL for temporary upload chunks
    createdAt: { type: Date, default: Date.now, expires: 7200 },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

UploadChunkSchema.index({ uploadId: 1, chunkIndex: 1 }, { unique: true });

export const UploadChunkModel: Model<IUploadChunk> =
  mongoose.models.UploadChunk ||
  mongoose.model<IUploadChunk>('UploadChunk', UploadChunkSchema);
