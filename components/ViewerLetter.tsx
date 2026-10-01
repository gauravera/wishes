'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { SurpriseData } from '@/types/ecard';
import { EVENT_PRESETS, getEventMascot } from '@/lib/constants';

interface ViewerLetterProps {
  data: SurpriseData;
  isViewOnly?: boolean;
  onOpenSaveModal?: () => void;
  onPauseBackgroundMusic?: () => void;
  onResumeBackgroundMusic?: () => void;
}

export const ViewerLetter: React.FC<ViewerLetterProps> = ({
  data,
  isViewOnly = false,
  onOpenSaveModal,
  onPauseBackgroundMusic,
  onResumeBackgroundMusic,
}) => {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceCurrentTime, setVoiceCurrentTime] = useState(0);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const voiceAudRef = useRef<HTMLAudioElement | null>(null);

  const preset =
    EVENT_PRESETS[data.eventType as keyof typeof EVENT_PRESETS] ||
    EVENT_PRESETS.boyfriend;

  const mascot = getEventMascot(data.eventType);
  const signoffWord = preset.signoff || 'always yours';

  const formatTime = (t: number) => {
    if (!isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = String(Math.floor(t % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  const toggleVoicePlay = () => {
    const aud = voiceAudRef.current;
    if (!aud || !aud.src) return;
    if (aud.paused) {
      if (onPauseBackgroundMusic) onPauseBackgroundMusic();
      aud.play().then(() => setIsPlayingVoice(true)).catch(console.error);
    } else {
      aud.pause();
      setIsPlayingVoice(false);
      if (onResumeBackgroundMusic) onResumeBackgroundMusic();
    }
  };

  const handleVoiceEnded = () => {
    setIsPlayingVoice(false);
    if (onResumeBackgroundMusic) onResumeBackgroundMusic();
  };

  const validPhotos = (data.photos || []).filter(Boolean);

  const isBirthday = data.eventType === 'birthday';

  return (
    <div className="sec sec-letter">
      <p className="hand" style={{ fontSize: 24, color: 'var(--teal-d)' }}>
        {isBirthday ? '🎂 the best part 🎂' : '✿ one last thing ✿'}
      </p>
      <h1 className="title sub" style={{ margin: '4px 0 24px' }}>
        {isBirthday ? 'Your Birthday Letter' : 'A Note For You'}
      </h1>

      {/* Voice Note Cassette Player */}
      {data.voiceNoteUrl && (
        <div className={`retro-cassette ${isPlayingVoice ? 'playing' : ''}`}>
          <audio
            ref={voiceAudRef}
            src={data.voiceNoteUrl}
            onEnded={handleVoiceEnded}
            onTimeUpdate={() => {
              if (voiceAudRef.current) {
                setVoiceCurrentTime(voiceAudRef.current.currentTime);
                setVoiceDuration(voiceAudRef.current.duration || 0);
              }
            }}
            preload="auto"
          />
          <div className="cassette-spool-box">📼</div>
          <div className="cassette-info">
            <div className="cassette-tag">VOICE MEMO FROM HEART</div>
            <div className="cassette-title">
              {data.voiceNoteTitle || `Voice Memo from ${data.sender}`}
            </div>
            <div className="cassette-ctl">
              <button
                type="button"
                className="cassette-play"
                onClick={toggleVoicePlay}
              >
                {isPlayingVoice ? '❚❚' : '▶'}
              </button>
              <span className="cassette-time">
                {formatTime(voiceCurrentTime)} / {formatTime(voiceDuration)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Lined Notebook Paper with Corner Pinned Polaroids */}
      <div className="pinned-letter-wrapper">
        <div className="pinned-notebook-sheet">
          {/* Top-Left Pinned Polaroid */}
          {validPhotos[0] && (
            <div className="pinned-polaroid polaroid-top-left">
              <div className="golden-pushpin" />
              <img
                src={validPhotos[0]}
                alt="Memory 1"
                className="pinned-polaroid-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/p1.jpeg';
                }}
              />
            </div>
          )}

          {/* Top-Right Pinned Polaroid */}
          {validPhotos[1] && (
            <div className="pinned-polaroid polaroid-top-right">
              <div className="golden-pushpin" />
              <img
                src={validPhotos[1]}
                alt="Memory 2"
                className="pinned-polaroid-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/p2.jpeg';
                }}
              />
            </div>
          )}

          {/* Bottom-Right Pinned Polaroid */}
          {validPhotos[2] && (
            <div className="pinned-polaroid polaroid-bottom-right">
              <div className="golden-pushpin" />
              <img
                src={validPhotos[2]}
                alt="Memory 3"
                className="pinned-polaroid-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/p3.jpeg';
                }}
              />
            </div>
          )}

          {/* Mascot Peeking from Bottom-Left */}
          <img
            className="pinned-mascot-peeker"
            src={mascot}
            alt="Mascot"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/mascots/cat.gif';
            }}
          />

          {/* Inner Handwritten Letter Text (Safely within margins) */}
          <div className="letter-text-content">
            <div className="letter-greeting">
              Hey {data.receiver},
            </div>

            <div className="letter-body-message">
              {data.message}
            </div>

            <div className="letter-signoff-section">
              <div className="letter-signoff-word">{signoffWord},</div>
              <div className="letter-signature-wrap">
                <span className="letter-signature-name">{data.sender}</span>
                <div className="letter-signature-wavy" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isViewOnly ? (
        <div style={{ marginTop: 42 }}>
          <Link href="/" className="btn primary" style={{ padding: '14px 36px', fontSize: 15 }}>
            Create Your Own E-Card ✿
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: 42 }}>
          <button
            type="button"
            className="btn primary"
            style={{ padding: '14px 42px', fontSize: 16 }}
            onClick={onOpenSaveModal}
          >
            Generate QR &amp; Link
          </button>
          <p style={{ fontSize: 13.5, color: 'var(--mut)', marginTop: 10 }}>
            Happy with it? This uploads everything to your backend and creates the shareable link.
          </p>
        </div>
      )}
    </div>
  );
};
