export type EventType =
  | 'boyfriend'
  | 'girlfriend'
  | 'bestfriend'
  | 'valentines'
  | 'missyou'
  | 'anniversary'
  | 'birthday'
  | 'custom';

export type VibeType = 'romantic' | 'playful' | 'nostalgic' | 'wholesome' | 'funny';

export type WitnessType = 'cat' | 'boka' | 'friend' | 'dog' | 'moon' | 'cupid' | 'custom';

export interface ThemeColors {
  '--bg': string;
  '--ink': string;
  '--teal': string;
  '--teal-d': string;
  '--mint': string;
  '--peach': string;
  '--gold': string;
  '--line': string;
}

export interface EnvelopePreset {
  h2: string;
  p1: string;
  p2: string;
  stamp: string;
  heart: string;
}

export interface CertificatePreset {
  badge: string;
  title: string;
  sub: string;
  witness: string;
  terms: string[];
}

export interface SecretLockPreset {
  question: string;
  answer: string;
  hint: string;
}

export interface EventPreset {
  name: string;
  handTag: string;
  headline: string;
  senderLabel: string;
  receiverLabel: string;
  senderPlaceholder: string;
  receiverPlaceholder: string;
  defaultVibe: VibeType;
  defaultMessage: string;
  theme: ThemeColors;
  envelope: EnvelopePreset;
  viewerEyebrow: string;
  certificate: CertificatePreset;
  memories: string[];
  secretLock: SecretLockPreset;
  scratchCoupons: string[];
  voicePrompt: string;
  signoff: string;
}

export interface MemeItem {
  id: number;
  title: string;
  category: 'romantic' | 'funny' | 'cute';
  src: string;
  caption: string;
}

export interface WallSlot {
  type: 'library' | 'upload';
  url: string;
  title: string;
  memeId: number | null;
  file?: File | null;
  note: string;
}

export interface SurpriseData {
  id?: string;
  eventType: EventType | string;
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
  witnessType?: WitnessType | string;
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
  createdAt?: string;
  expiresAt?: string;
  isExpired?: boolean;
}
