import mongoose, { Schema, Model } from 'mongoose';
import { ThemeColors } from '@/types/ecard';

export interface ISurprise {
  id: string;
  eventType: string;
  eventTitle?: string;
  vibe?: string;
  sender: string;
  receiver: string;
  message: string;
  photos: string[];
  wallPhotos?: string[];
  memoryNotes?: string[];
  envelopeLetterTitle?: string;
  envelopeLetterSub?: string;
  envelopeStamp?: string;
  certificateBadge?: string;
  certificateTitle?: string;
  certificateTerms?: string[];
  certificateSub?: string;
  certificateSigner?: string;
  witnessType?: string;
  witnessName?: string;
  witnessPhotoUrl?: string | null;
  musicUrl?: string;
  songTitle?: string;
  voiceNoteUrl?: string | null;
  voiceNoteTitle?: string;
  scratchCoupons?: string[];
  secretQuestion?: string;
  secretAnswer?: string;
  secretHint?: string;
  themeColors?: ThemeColors | null;
  payment_id?: string;
  createdAt: Date;
  expiresAt?: string;
}

const SurpriseSchema = new Schema<ISurprise>(
  {
    id: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, default: 'boyfriend' },
    eventTitle: { type: String, default: '' },
    vibe: { type: String, default: 'romantic' },
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    message: { type: String, default: '' },
    photos: { type: [String], default: [] },
    wallPhotos: { type: [String], default: [] },
    memoryNotes: { type: [String], default: [] },
    envelopeLetterTitle: { type: String, default: '' },
    envelopeLetterSub: { type: String, default: '' },
    envelopeStamp: { type: String, default: '' },
    certificateBadge: { type: String, default: '' },
    certificateTitle: { type: String, default: '' },
    certificateTerms: { type: [String], default: [] },
    certificateSub: { type: String, default: '' },
    certificateSigner: { type: String, default: '' },
    witnessType: { type: String, default: 'cat' },
    witnessName: { type: String, default: '' },
    witnessPhotoUrl: { type: String, default: null },
    musicUrl: { type: String, default: '' },
    songTitle: { type: String, default: '' },
    voiceNoteUrl: { type: String, default: null },
    voiceNoteTitle: { type: String, default: '' },
    scratchCoupons: { type: [String], default: [] },
    secretQuestion: { type: String, default: '' },
    secretAnswer: { type: String, default: '' },
    secretHint: { type: String, default: '' },
    themeColors: { type: Schema.Types.Mixed, default: null },
    payment_id: { type: String, default: '' },
    expiresAt: { type: String, default: '' },
    // Automatic 24-hour TTL index in MongoDB (86400 seconds)
    createdAt: { type: Date, default: Date.now, expires: 86400 },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const SurpriseModel: Model<ISurprise> =
  mongoose.models.Surprise || mongoose.model<ISurprise>('Surprise', SurpriseSchema);
