'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  EventType,
  VibeType,
  WitnessType,
  WallSlot,
  SurpriseData,
  MemeItem,
  ThemeColors,
} from '@/types/ecard';
import {
  EVENT_PRESETS,
  VIBE_THEMES,
  VIBE_CONTENT_MAP,
  VIRAL_MEME_LIBRARY,
  WITNESS_NAME_MAP,
} from '@/lib/constants';
import { shrink } from '@/lib/client-utils';
import { uploadLargeAudioInChunks } from '@/lib/chunked-upload';
import { EventPicker } from '@/components/EventPicker';
import { VibePicker } from '@/components/VibePicker';
import { PhotoUploader } from '@/components/PhotoUploader';
import { MusicUploader } from '@/components/MusicUploader';
import { VoiceNoteRecorder } from '@/components/VoiceNoteRecorder';
import { AddonsAccordion } from '@/components/AddonsAccordion';
import { WallSlotsGrid } from '@/components/WallSlotsGrid';
import { MemeLibraryModal } from '@/components/MemeLibraryModal';
import { ViewerEnvelope } from '@/components/ViewerEnvelope';
import { ViewerHero } from '@/components/ViewerHero';
import { ViewerWall } from '@/components/ViewerWall';
import { ViewerCertificate } from '@/components/ViewerCertificate';
import { ViewerCoupons } from '@/components/ViewerCoupons';
import { ViewerLetter } from '@/components/ViewerLetter';
import { ShareModal } from '@/components/ShareModal';

function ECardApp() {
  const searchParams = useSearchParams();
  const sidFromQuery = searchParams.get('id');

  // Creator step: 1 = Template Selection, 2 = Details & Audio Form, 3 = Memes & Addons
  const [creatorStep, setCreatorStep] = useState<1 | 2 | 3>(1);

  // Viewer step: 1 = Envelope, 2 = Hero, 3 = Wall, 4 = Certificate, 5 = Letter
  const [viewerStep, setViewerStep] = useState<number | null>(null);

  const [isViewMode, setIsViewMode] = useState<boolean>(false);
  const [loadingSurprise, setLoadingSurprise] = useState<boolean>(false);
  const [surpriseFetchError, setSurpriseFetchError] = useState<boolean>(false);
  const [surpriseExpired, setSurpriseExpired] = useState<boolean>(false);

  // Form State
  const [currentEvent, setCurrentEvent] = useState<EventType>('boyfriend');
  const [customEventTitle, setCustomEventTitle] = useState<string>('');
  const [currentVibe, setCurrentVibe] = useState<VibeType>('romantic');
  const [sender, setSender] = useState<string>('');
  const [receiver, setReceiver] = useState<string>('');
  const [message, setMessage] = useState<string>(VIBE_CONTENT_MAP.boyfriend.romantic.message);
  const [formError, setFormError] = useState<string>('');

  // Photos
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>(['', '', '']);

  // Music & Voice
  const [selectedSongFile, setSelectedSongFile] = useState<File | null>(null);
  const [songTitle, setSongTitle] = useState<string>('');
  const [voiceBlob, setVoiceBlob] = useState<Blob | File | null>(null);
  const [voiceTitle, setVoiceTitle] = useState<string>('');

  // Addons (Optional - not prefilled)
  const [secretQuestion, setSecretQuestion] = useState<string>('');
  const [secretAnswer, setSecretAnswer] = useState<string>('');
  const [secretHint, setSecretHint] = useState<string>('');
  const [scratchCoupons, setScratchCoupons] = useState<string[]>([
    ...VIBE_CONTENT_MAP.boyfriend.romantic.scratchCoupons,
  ]);
  const [witnessType, setWitnessType] = useState<WitnessType>('cat');
  const [witnessName, setWitnessName] = useState<string>('the cat (official witness)');
  const [witnessPhoto, setWitnessPhoto] = useState<File | null>(null);
  const [certTitle, setCertTitle] = useState<string>(
    VIBE_CONTENT_MAP.boyfriend.romantic.certTitle
  );
  const [certTerms, setCertTerms] = useState<string[]>([
    ...VIBE_CONTENT_MAP.boyfriend.romantic.terms,
  ]);
  const [memoryNotes, setMemoryNotes] = useState<string[]>([
    ...VIBE_CONTENT_MAP.boyfriend.romantic.memories,
  ]);

  // Wall Slots
  const [wallSlots, setWallSlots] = useState<WallSlot[]>(
    [0, 1, 2, 3, 4, 5].map((i) => ({
      type: 'library',
      url: `/library/viral_${i + 1}.jpg`,
      title: VIRAL_MEME_LIBRARY[i].title,
      memeId: i + 1,
      file: null,
      note: VIBE_CONTENT_MAP.boyfriend.romantic.memories[i],
    }))
  );

  // Meme Modal State
  const [isMemeModalOpen, setIsMemeModalOpen] = useState<boolean>(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);

  // Active Surprise Viewer Data
  const [activeSurpriseData, setActiveSurpriseData] = useState<SurpriseData | null>(null);

  // Audio Playback
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);

  // Save Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareStatus, setShareStatus] = useState<'pay' | 'busy' | 'fail' | 'done'>('pay');
  const [shareErrorMessage, setShareErrorMessage] = useState<string>('');
  const [savedSurpriseId, setSavedSurpriseId] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');

  // Apply Theme Helper
  const applyTheme = (theme?: ThemeColors | null) => {
    if (!theme) return;
    const root = document.documentElement;
    for (const [key, val] of Object.entries(theme)) {
      root.style.setProperty(key, val);
    }
  };

  // Synchronize content and theme when event or vibe changes
  const applyEventAndVibe = (ev: EventType, vb: VibeType) => {
    const override = VIBE_CONTENT_MAP[ev]?.[vb] || VIBE_CONTENT_MAP.boyfriend.romantic;
    const theme = VIBE_THEMES[vb] || VIBE_THEMES.romantic;

    setMessage(override.message);
    setCertTitle(override.certTitle);
    setCertTerms([...override.terms]);
    setMemoryNotes([...override.memories]);
    setScratchCoupons([...override.scratchCoupons]);

    if (ev === 'girlfriend') {
      setWitnessType('boka');
      setWitnessName(WITNESS_NAME_MAP.boka);
    } else if (ev === 'bestfriend') {
      setWitnessType('friend');
      setWitnessName(WITNESS_NAME_MAP.friend);
    } else if (ev === 'valentines') {
      setWitnessType('cupid');
      setWitnessName(WITNESS_NAME_MAP.cupid);
    } else if (ev === 'missyou') {
      setWitnessType('moon');
      setWitnessName(WITNESS_NAME_MAP.moon);
    } else {
      setWitnessType('cat');
      setWitnessName(WITNESS_NAME_MAP.cat);
    }

    // Sync wall slot notes
    setWallSlots((prev) =>
      prev.map((slot, i) => ({
        ...slot,
        note: override.memories[i] || slot.note,
      }))
    );

    applyTheme(theme);
  };

  // Initial fetch for view mode if ?id= is in query
  useEffect(() => {
    if (sidFromQuery) {
      setIsViewMode(true);
      setLoadingSurprise(true);
      setSurpriseFetchError(false);
      setSurpriseExpired(false);

      fetch(`/api/surprise/${encodeURIComponent(sidFromQuery)}`)
        .then(async (res) => {
          if (res.status === 410) {
            throw new Error('EXPIRED');
          }
          if (!res.ok) throw new Error('NOT_FOUND');
          return res.json();
        })
        .then((data: SurpriseData) => {
          if (data.isExpired) {
            setSurpriseExpired(true);
            setLoadingSurprise(false);
            return;
          }
          setActiveSurpriseData(data);
          applyTheme(data.themeColors);
          const songSrc = data.musicUrl || '/song.mp3';
          if (bgAudioRef.current) {
            bgAudioRef.current.src = songSrc;
            bgAudioRef.current.load();
          }
          setViewerStep(1);
          setLoadingSurprise(false);
        })
        .catch((err) => {
          console.error(err);
          if (err.message === 'EXPIRED') {
            setSurpriseExpired(true);
          } else {
            setSurpriseFetchError(true);
          }
          setLoadingSurprise(false);
        });
    } else {
      setIsViewMode(false);
      setViewerStep(null);
      setCreatorStep(1);
      applyTheme(VIBE_THEMES.romantic);
    }
  }, [sidFromQuery]);

  // Handle Event Selection
  const handleSelectEvent = (ev: EventType) => {
    setCurrentEvent(ev);
    applyEventAndVibe(ev, currentVibe);
  };

  // Handle Vibe Selection
  const handleSelectVibe = (vb: VibeType) => {
    setCurrentVibe(vb);
    applyEventAndVibe(currentEvent, vb);
  };

  const handleWitnessTypeChange = (type: WitnessType) => {
    setWitnessType(type);
    if (WITNESS_NAME_MAP[type]) {
      setWitnessName(WITNESS_NAME_MAP[type]);
    }
  };

  const handlePhotoChange = (idx: number, file: File) => {
    const updatedPhotos = [...photos];
    updatedPhotos[idx] = file;
    setPhotos(updatedPhotos);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || URL.createObjectURL(file);
      setPhotoPreviewUrls((prev) => {
        const copy = [...prev];
        copy[idx] = dataUrl;
        return copy;
      });
    };
    reader.onerror = () => {
      const fallbackUrl = URL.createObjectURL(file);
      setPhotoPreviewUrls((prev) => {
        const copy = [...prev];
        copy[idx] = fallbackUrl;
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadWallPhoto = (slotIdx: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewUrl = (e.target?.result as string) || URL.createObjectURL(file);
      setWallSlots((prev) => {
        const copy = [...prev];
        copy[slotIdx] = {
          type: 'upload',
          url: previewUrl,
          title: file.name.length > 18 ? file.name.slice(0, 15) + '...' : file.name,
          memeId: null,
          file,
          note: copy[slotIdx].note,
        };
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleResetWallSlot = (slotIdx: number) => {
    const defMeme = VIRAL_MEME_LIBRARY[slotIdx];
    setWallSlots((prev) => {
      const copy = [...prev];
      copy[slotIdx] = {
        type: 'library',
        url: defMeme.src,
        title: defMeme.title,
        memeId: defMeme.id,
        file: null,
        note: copy[slotIdx].note,
      };
      return copy;
    });
  };

  const handleShuffleMemes = () => {
    const shuffled = [...VIRAL_MEME_LIBRARY].sort(() => 0.5 - Math.random());
    setWallSlots((prev) =>
      prev.map((slot, i) => ({
        type: 'library',
        url: shuffled[i].src,
        title: shuffled[i].title,
        memeId: shuffled[i].id,
        file: null,
        note: slot.note,
      }))
    );
  };

  const handleResetAllMemes = () => {
    setWallSlots((prev) =>
      prev.map((slot, i) => ({
        type: 'library',
        url: VIRAL_MEME_LIBRARY[i].src,
        title: VIRAL_MEME_LIBRARY[i].title,
        memeId: VIRAL_MEME_LIBRARY[i].id,
        file: null,
        note: slot.note,
      }))
    );
  };

  // Web Audio Context Unlocker for iOS Safari / Mobile WebKit
  const unlockAudioContext = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
      }
    } catch (e) {
      // Non-critical
    }
  };

  // Live Music Playback (Mobile iOS & Android & Desktop Resilient)
  const toggleMusic = () => {
    unlockAudioContext();
    const aud = bgAudioRef.current;
    if (!aud) return;
    const song = activeSurpriseData?.musicUrl || '/song.mp3';
    
    // Always sync to the active surprise song (user uploaded custom song or default)
    if (!aud.src || !aud.src.endsWith(song) && aud.src !== song) {
      aud.src = song;
      aud.load();
    }

    if (aud.paused) {
      aud.volume = 1.0;
      const playPromise = aud.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlayingMusic(true))
          .catch((err) => {
            console.warn('Playback error / waiting for user tap:', err);
            setIsPlayingMusic(false);
          });
      }
    } else {
      aud.pause();
      setIsPlayingMusic(false);
    }
  };

  // Preview Button Handler
  const handlePreview = () => {
    if (!sender.trim() || !receiver.trim()) {
      setFormError("Please add both your name and recipient's name.");
      return;
    }
    if (photos.some((p) => !p)) {
      setFormError('Please select all 3 photos.');
      return;
    }
    if (!message.trim()) {
      setFormError('Please write a personal message.');
      return;
    }
    setFormError('');

    const preset = EVENT_PRESETS[currentEvent];
    const vibeOverride = VIBE_CONTENT_MAP[currentEvent]?.[currentVibe] || VIBE_CONTENT_MAP.boyfriend.romantic;
    const finalEventTitle =
      currentEvent === 'custom' && customEventTitle.trim()
        ? customEventTitle.trim()
        : preset.name;

    const previewSongUrl = selectedSongFile ? URL.createObjectURL(selectedSongFile) : '/song.mp3';
    const previewVoiceUrl = voiceBlob ? URL.createObjectURL(voiceBlob) : null;
    const previewWitnessPhotoUrl = witnessPhoto ? URL.createObjectURL(witnessPhoto) : null;

    const previewData: SurpriseData = {
      eventType: currentEvent,
      eventTitle: finalEventTitle,
      vibe: currentVibe,
      envelopeLetterTitle: preset.envelope.h2,
      envelopeLetterSub: preset.envelope.p1,
      envelopeStamp: preset.envelope.stamp,
      certificateBadge: preset.certificate.badge,
      certificateTitle: certTitle.trim() || vibeOverride.certTitle,
      certificateTerms: certTerms,
      witnessName: witnessName.trim() || preset.certificate.witness,
      witnessPhotoUrl: previewWitnessPhotoUrl,
      wallPhotos: wallSlots.map((s) => s.url),
      memoryNotes: wallSlots.map((s, idx) => s.note.trim() || memoryNotes[idx] || vibeOverride.memories[idx]),
      scratchCoupons: scratchCoupons.filter((c) => c.trim()),
      secretQuestion: secretQuestion.trim(),
      secretAnswer: secretAnswer.trim(),
      secretHint: secretHint.trim(),
      themeColors: VIBE_THEMES[currentVibe],
      musicUrl: previewSongUrl,
      songTitle: songTitle.trim() || (selectedSongFile ? selectedSongFile.name.replace(/\.[^/.]+$/, '') : 'Our Song'),
      voiceNoteUrl: previewVoiceUrl,
      voiceNoteTitle: voiceTitle.trim() || 'A special voice note for you',
      sender,
      receiver,
      message,
      photos: photoPreviewUrls,
    };

    setActiveSurpriseData(previewData);
    if (bgAudioRef.current && previewSongUrl) {
      bgAudioRef.current.src = previewSongUrl;
      bgAudioRef.current.load();
    }
    setViewerStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Upload to Backend API
  const handleFinalUpload = async () => {
    setShareStatus('busy');
    try {
      const preset = EVENT_PRESETS[currentEvent];
      const vibeOverride = VIBE_CONTENT_MAP[currentEvent]?.[currentVibe] || VIBE_CONTENT_MAP.boyfriend.romantic;
      const finalTitle =
        currentEvent === 'custom' && customEventTitle.trim()
          ? customEventTitle.trim()
          : preset.name;

      const formData = new FormData();
      formData.append('sender', sender.trim());
      formData.append('receiver', receiver.trim());
      formData.append('message', message.trim());
      formData.append('eventType', currentEvent);
      formData.append('eventTitle', finalTitle);
      formData.append('vibe', currentVibe);
      formData.append('envelopeLetterTitle', preset.envelope.h2);
      formData.append('envelopeLetterSub', preset.envelope.p1);
      formData.append('envelopeStamp', preset.envelope.stamp);
      formData.append('certificateBadge', preset.certificate.badge);
      formData.append('certificateTitle', certTitle.trim() || vibeOverride.certTitle);
      formData.append('certificateTerms', JSON.stringify(certTerms));
      formData.append('witnessType', witnessType);
      formData.append('witnessName', witnessName.trim() || preset.certificate.witness);

      const finalMemories = wallSlots.map(
        (s, idx) => s.note.trim() || memoryNotes[idx] || vibeOverride.memories[idx]
      );
      formData.append('memoryNotes', JSON.stringify(finalMemories));

      // Wall photos config
      let uploadWallCount = 0;
      const wallConfig = wallSlots.map((s) => {
        if (s.file) {
          return `upload:${uploadWallCount++}`;
        }
        return s.url;
      });
      formData.append('wallPhotosConfig', JSON.stringify(wallConfig));

      formData.append('scratchCoupons', JSON.stringify(scratchCoupons.filter((c) => c.trim())));
      formData.append('secretQuestion', secretQuestion.trim());
      formData.append('secretAnswer', secretAnswer.trim());
      formData.append('secretHint', secretHint.trim());
      formData.append('themeColors', JSON.stringify(VIBE_THEMES[currentVibe]));
      formData.append('payment_id', `FREE-${Date.now()}`);

      // Custom song (Upload via chunks if > 2MB to support up to 20MB files without hitting Vercel limit)
      if (selectedSongFile) {
        if (selectedSongFile.size > 2 * 1024 * 1024) {
          const songMediaUrl = await uploadLargeAudioInChunks(selectedSongFile, selectedSongFile.name);
          formData.append('songUrl', songMediaUrl);
        } else {
          formData.append('song', selectedSongFile);
        }
      }
      if (songTitle.trim()) {
        formData.append('songTitle', songTitle.trim());
      }

      // Voice note (Upload via chunks if > 2MB)
      if (voiceBlob) {
        if (voiceBlob.size > 2 * 1024 * 1024) {
          const voiceMediaUrl = await uploadLargeAudioInChunks(voiceBlob, 'voice-note.webm');
          formData.append('voiceNoteUrl', voiceMediaUrl);
        } else {
          formData.append('voiceNote', voiceBlob, 'voice-note.webm');
        }
      }
      if (voiceTitle.trim()) {
        formData.append('voiceNoteTitle', voiceTitle.trim());
      }

      // Witness photo with compression
      if (witnessPhoto) {
        try {
          const witnessCompressed = await shrink(witnessPhoto, 600);
          formData.append('witnessPhoto', witnessCompressed, 'witness.jpg');
        } catch (err) {
          console.warn('Fallback to raw witness photo:', err);
          formData.append('witnessPhoto', witnessPhoto);
        }
      }

      // 3 Main Photos with compression
      for (let i = 0; i < 3; i++) {
        if (photos[i]) {
          try {
            const compressedBlob = await shrink(photos[i]!, 800);
            formData.append('photos', compressedBlob, `photo-${i + 1}.jpg`);
          } catch (err) {
            console.warn(`Fallback to raw photo ${i + 1}:`, err);
            formData.append('photos', photos[i]!, `photo-${i + 1}.jpg`);
          }
        }
      }

      // Custom Wall Uploads
      for (let i = 0; i < 6; i++) {
        if (wallSlots[i] && wallSlots[i].file) {
          try {
            const wallCompressed = await shrink(wallSlots[i].file!, 800);
            formData.append('wallPhotos', wallCompressed, `wall-${i + 1}.jpg`);
          } catch (err) {
            console.warn(`Fallback to raw wall photo ${i + 1}:`, err);
            formData.append('wallPhotos', wallSlots[i].file!, `wall-${i + 1}.jpg`);
          }
        }
      }

      const res = await fetch('/api/create', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 413 || errText.includes('FUNCTION_PAYLOAD_TOO_LARGE') || errText.includes('Request Entity Too Large')) {
          throw new Error('Upload error (413): The uploaded payload is too large. Please check your photos or audio.');
        }
        throw new Error(`Upload error (${res.status}): ${errText}`);
      }

      const result = await res.json();
      const generatedLink = `${window.location.origin}/${result.id}`;
      setSavedSurpriseId(result.id);
      setShareUrl(generatedLink);
      setShareStatus('done');
    } catch (err: any) {
      console.error('Upload failed:', err);
      setShareErrorMessage(err.message || 'Upload failed');
      setShareStatus('fail');
    }
  };

  // Keyboard navigation for viewer steps
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        viewerStep !== null &&
        !isShareModalOpen &&
        !isMemeModalOpen &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')
      ) {
        if (e.key === 'ArrowRight' && viewerStep < 6) setViewerStep((s) => (s ? s + 1 : 1));
        if (e.key === 'ArrowLeft' && viewerStep > 1) setViewerStep((s) => (s ? s - 1 : 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerStep, isShareModalOpen, isMemeModalOpen]);

  // Loading or Error states in View Mode
  if (loadingSurprise) {
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 120 }}>
        <h2>Loading your special surprise…</h2>
        <div style={{ fontSize: 40, margin: '24px 0' }}>💌</div>
      </div>
    );
  }

  if (surpriseExpired) {
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 100, maxWidth: 520 }}>
        <div style={{ fontSize: 50, marginBottom: 12 }}>⏰</div>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>This E-Card has Expired</h2>
        <p style={{ color: 'var(--mut)', fontSize: 15, lineHeight: 1.6 }}>
          For privacy and temporary storage, e-cards are kept active for <strong>24 hours only</strong>. The media and message for this card have been automatically cleared.
        </p>
        <a href="/" className="btn primary" style={{ marginTop: 26, display: 'inline-block' }}>
          Create a New E-Card ✿
        </a>
      </div>
    );
  }

  if (surpriseFetchError) {
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 100 }}>
        <h2>This link doesn&apos;t look right</h2>
        <p style={{ marginTop: 10, color: 'var(--mut)' }}>
          Ask the sender to share the link again, or create your own!
        </p>
        <a href="/" className="btn" style={{ marginTop: 24 }}>
          Create an E-Card ✿
        </a>
      </div>
    );
  }

  const preset = EVENT_PRESETS[currentEvent];

  const vibeDescriptions: Record<VibeType, string> = {
    romantic: 'Warm rose palettes, tender words & sweet inside jokes 💖',
    playful: 'Fun colorful vibes, silly agreements & witty banter 🎉',
    nostalgic: 'Twilight lavender, polaroid reminiscing & heartfelt memories 🌌',
    wholesome: 'Botanical mint, cozy blankets & gentle comforting hugs 🌸',
    funny: 'Golden retro mustard, unhinged roasts & hilarious pacts 🤪',
  };

  return (
    <div className="page-container">
      {/* Background Audio Player */}
      <audio
        ref={bgAudioRef}
        loop
        preload="auto"
        playsInline
        onPlay={() => setIsPlayingMusic(true)}
        onPause={() => setIsPlayingMusic(false)}
      />

      {/* =========================================================================
          CREATOR MODE - PAGE 1: TEMPLATE & VIBE SELECTION (Screenshot 1)
         ========================================================================= */}
      {viewerStep === null && creatorStep === 1 && !isViewMode && (
        <main className="wrap" style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <header className="head-section">
            <span className="badge-tag">✨ {preset.name} ✨</span>
            <p className="hand">{preset.handTag}</p>
            <h1>{preset.headline}</h1>
          </header>

          <EventPicker
            currentEvent={currentEvent}
            onSelectEvent={handleSelectEvent}
          />

          {currentEvent === 'custom' && (
            <div style={{ maxWidth: 440, margin: '0 auto 16px', width: '100%' }}>
              <label style={{ textAlign: 'center' }}>Custom Event Title</label>
              <input
                type="text"
                value={customEventTitle}
                onChange={(e) => setCustomEventTitle(e.target.value)}
                placeholder="e.g. Happy Graduation or Promotion Day"
              />
            </div>
          )}

          <VibePicker
            currentVibe={currentVibe}
            onSelectVibe={handleSelectVibe}
          />

          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span style={{ fontSize: 13, color: 'var(--mut)', fontStyle: 'italic' }}>
              Mood: {vibeDescriptions[currentVibe]}
            </span>
          </div>

          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button
              type="button"
              className="btn"
              style={{ padding: '14px 40px', fontSize: 16 }}
              onClick={() => {
                setCreatorStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Next: Personalize E-Card →
            </button>
          </div>
        </main>
      )}

      {/* =========================================================================
          CREATOR MODE - PAGE 2: FILL DETAILS, PHOTOS & AUDIO
         ========================================================================= */}
      {viewerStep === null && creatorStep === 2 && !isViewMode && (
        <main className="wrap wrap-md">
          <div className="step-top-bar">
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={() => {
                setCreatorStep(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              ← Change Template / Vibe
            </button>
            <span className="badge-tag" style={{ margin: 0 }}>
              ✨ {preset.name} • {currentVibe.toUpperCase()}
            </span>
          </div>

          <div className="form-card">
            <div className="row">
              <div>
                <label>{preset.senderLabel}</label>
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder={preset.senderPlaceholder}
                />
              </div>
              <div>
                <label>{preset.receiverLabel}</label>
                <input
                  type="text"
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                  placeholder={preset.receiverPlaceholder}
                />
              </div>
            </div>

            <PhotoUploader
              photos={photos}
              previewUrls={photoPreviewUrls}
              onPhotoChange={handlePhotoChange}
            />

            <MusicUploader
              selectedSongFile={selectedSongFile}
              songTitle={songTitle}
              onSongChange={(f) => setSelectedSongFile(f)}
              onSongTitleChange={(t) => setSongTitle(t)}
            />

            <VoiceNoteRecorder
              voiceBlob={voiceBlob}
              voiceTitle={voiceTitle}
              voicePromptText={
                VIBE_CONTENT_MAP[currentEvent]?.[currentVibe]?.voicePrompt ||
                preset.voicePrompt
              }
              onVoiceChange={(b) => setVoiceBlob(b)}
              onVoiceTitleChange={(t) => setVoiceTitle(t)}
            />

            <label style={{ marginTop: 18 }}>Your personal message</label>
            <textarea
              rows={4}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write something sweet, funny, or memorable..."
            />

            {formError && <div className="err-banner">{formError}</div>}

            <div className="step-btn-row">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setCreatorStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  if (!sender.trim() || !receiver.trim()) {
                    setFormError('Please enter both your name and your partner’s name to continue ✿');
                    return;
                  }
                  setFormError('');
                  setCreatorStep(3);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Fill Other Part (Memes &amp; Extras) →
              </button>
            </div>
          </div>
        </main>
      )}

      {/* =========================================================================
          CREATOR MODE - PAGE 3: MEMES AREA & MEMORY WALL CARDS
         ========================================================================= */}
      {viewerStep === null && creatorStep === 3 && !isViewMode && (
        <main className="wrap wrap-wide">
          <div className="step-top-bar">
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={() => {
                setCreatorStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              ← Back to Details &amp; Audio
            </button>
            <span className="badge-tag" style={{ margin: 0 }}>
              📸 Memory Wall &amp; Memes
            </span>
          </div>

          <div className="form-card">
            {/* Memory Wall Cards (6 Photos / Memes) */}
            <WallSlotsGrid
              wallSlots={wallSlots}
              onOpenMemeModal={(idx) => {
                setActiveSlotIndex(idx);
                setIsMemeModalOpen(true);
              }}
              onUploadWallPhoto={handleUploadWallPhoto}
              onResetSlot={handleResetWallSlot}
              onNoteChange={(idx, val) => {
                setWallSlots((prev) => {
                  const copy = [...prev];
                  copy[idx].note = val;
                  return copy;
                });
              }}
            />

            <AddonsAccordion
              secretQuestion={secretQuestion}
              secretAnswer={secretAnswer}
              secretHint={secretHint}
              suggestedQuestion={VIBE_CONTENT_MAP[currentEvent]?.[currentVibe]?.secretLock?.question || 'e.g. Where did we first meet?'}
              suggestedAnswer={VIBE_CONTENT_MAP[currentEvent]?.[currentVibe]?.secretLock?.answer || 'e.g. Cafe Coffee Day'}
              suggestedHint={VIBE_CONTENT_MAP[currentEvent]?.[currentVibe]?.secretLock?.hint || 'e.g. Starts with C...'}
              onSecretQuestionChange={setSecretQuestion}
              onSecretAnswerChange={setSecretAnswer}
              onSecretHintChange={setSecretHint}
              scratchCoupons={scratchCoupons}
              onScratchCouponChange={(idx, val) => {
                const next = [...scratchCoupons];
                next[idx] = val;
                setScratchCoupons(next);
              }}
              witnessType={witnessType}
              witnessName={witnessName}
              onWitnessTypeChange={handleWitnessTypeChange}
              onWitnessNameChange={setWitnessName}
              onWitnessPhotoChange={setWitnessPhoto}
              certTitle={certTitle}
              onCertTitleChange={setCertTitle}
              certTerms={certTerms}
              onCertTermChange={(idx, val) => {
                const next = [...certTerms];
                next[idx] = val;
                setCertTerms(next);
              }}
              memoryNotes={memoryNotes}
              onMemoryNoteChange={(idx, val) => {
                const next = [...memoryNotes];
                next[idx] = val;
                setMemoryNotes(next);
                setWallSlots((prev) => {
                  const copy = [...prev];
                  if (copy[idx]) copy[idx].note = val;
                  return copy;
                });
              }}
            />

            {formError && <div className="err-banner">{formError}</div>}

            <div className="step-btn-row">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setCreatorStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handlePreview}
              >
                Preview E-Card →
              </button>
            </div>
          </div>
        </main>
      )}

      {/* =========================================================================
          VIEWER STEP 1: ENVELOPE
         ========================================================================= */}
      {viewerStep === 1 && activeSurpriseData && (
        <ViewerEnvelope
          data={activeSurpriseData}
          onOpenEnvelope={() => {
            unlockAudioContext();
            const aud = bgAudioRef.current;
            const song = activeSurpriseData.musicUrl || '/song.mp3';
            if (aud) {
              if (!aud.src || !aud.src.endsWith(song) && aud.src !== song) {
                aud.src = song;
                aud.load();
              }
              aud.play().then(() => setIsPlayingMusic(true)).catch((err) => {
                console.warn('Mobile autoplay policy prevented automatic sound; tap play button anytime:', err);
              });
            }
          }}
          onNext={() => {
            setViewerStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* =========================================================================
          VIEWER STEP 2: HERO & PLAYER
         ========================================================================= */}
      {viewerStep === 2 && activeSurpriseData && (
        <ViewerHero
          data={activeSurpriseData}
          onNext={() => setViewerStep(3)}
          isPlayingMusic={isPlayingMusic}
          onToggleMusic={toggleMusic}
          audioRef={bgAudioRef}
        />
      )}

      {/* =========================================================================
          VIEWER STEP 3: MEMORY WALL
         ========================================================================= */}
      {viewerStep === 3 && activeSurpriseData && (
        <ViewerWall
          data={activeSurpriseData}
          onNext={() => {
            setViewerStep(4);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* =========================================================================
          VIEWER STEP 4: CERTIFICATE
         ========================================================================= */}
      {viewerStep === 4 && activeSurpriseData && (
        <ViewerCertificate
          data={activeSurpriseData}
          onNext={() => {
            setViewerStep(5);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* =========================================================================
          VIEWER STEP 5: DEDICATED SCRATCH CARDS / LOVE VOUCHERS
         ========================================================================= */}
      {viewerStep === 5 && activeSurpriseData && (
        <ViewerCoupons
          data={activeSurpriseData}
          onNext={() => {
            setViewerStep(6);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* =========================================================================
          VIEWER STEP 6: LETTER & VOICE CASSETTE
         ========================================================================= */}
      {viewerStep === 6 && activeSurpriseData && (
        <ViewerLetter
          data={activeSurpriseData}
          isViewOnly={isViewMode}
          onOpenSaveModal={() => {
            setIsShareModalOpen(true);
            if (savedSurpriseId && shareUrl) {
              setShareStatus('done');
            } else {
              setShareStatus('busy');
              handleFinalUpload();
            }
          }}
          onPauseBackgroundMusic={() => {
            if (bgAudioRef.current) bgAudioRef.current.pause();
          }}
          onResumeBackgroundMusic={() => {
            if (bgAudioRef.current && activeSurpriseData.musicUrl) {
              bgAudioRef.current.play().catch(() => {});
            }
          }}
        />
      )}

      {/* MEME LIBRARY MODAL */}
      <MemeLibraryModal
        isOpen={isMemeModalOpen}
        activeSlotIndex={activeSlotIndex}
        currentSelectedUrl={wallSlots[activeSlotIndex]?.url}
        onClose={() => setIsMemeModalOpen(false)}
        onSelectMeme={(meme: MemeItem) => {
          setWallSlots((prev) => {
            const copy = [...prev];
            copy[activeSlotIndex] = {
              type: 'library',
              url: meme.src,
              title: meme.title,
              memeId: meme.id,
              file: null,
              note: copy[activeSlotIndex].note,
            };
            return copy;
          });
        }}
      />

      {/* SAVE / SHARE MODAL */}
      <ShareModal
        isOpen={isShareModalOpen}
        status={shareStatus}
        errorMessage={shareErrorMessage}
        shareUrl={shareUrl}
        surpriseId={savedSurpriseId}
        onClose={() => setIsShareModalOpen(false)}
        onUpload={handleFinalUpload}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="wrap" style={{ textAlign: 'center', paddingTop: 100 }}>
          <h2>Loading…</h2>
        </div>
      }
    >
      <ECardApp />
    </Suspense>
  );
}
