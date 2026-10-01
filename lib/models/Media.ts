import mongoose, { Schema, Model } from 'mongoose';

export interface IMedia {
  id: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
  size: number;
  createdAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    id: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, default: 'audio.mp3' },
    mimeType: { type: String, default: 'audio/mpeg' },
    data: { type: Buffer, required: true },
    size: { type: Number, default: 0 },
    // 24-hour TTL automatic cleanup
    createdAt: { type: Date, default: Date.now, expires: 86400 },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const MediaModel: Model<IMedia> =
  mongoose.models.Media || mongoose.model<IMedia>('Media', MediaSchema);
