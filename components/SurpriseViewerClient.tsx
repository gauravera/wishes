'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SurpriseData, ThemeColors } from '@/types/ecard';
import { ViewerEnvelope } from '@/components/ViewerEnvelope';
import { ViewerHero } from '@/components/ViewerHero';
import { ViewerWall } from '@/components/ViewerWall';
import { ViewerCertificate } from '@/components/ViewerCertificate';
import { ViewerCoupons } from '@/components/ViewerCoupons';
import { ViewerLetter } from '@/components/ViewerLetter';

interface SurpriseViewerClientProps {
  initialData?: SurpriseData | null;
  id?: string;
  isExpired?: boolean;
}

export function SurpriseViewerClient({
  initialData,
  id,
  isExpired: initialExpired,
}: SurpriseViewerClientProps) {
  const [data, setData] = useState<SurpriseData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData && !!id);
  const [error, setError] = useState<boolean>(!initialData && !id);
  const [expired, setExpired] = useState<boolean>(!!initialExpired || !!initialData?.isExpired);
  const [viewerStep, setViewerStep] = useState<number>(1);
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);

  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  const applyTheme = (theme?: ThemeColors | null) => {
    if (!theme) return;
    const root = document.documentElement;
    for (const [key, val] of Object.entries(theme)) {
      root.style.setProperty(key, val);
    }
  };

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      applyTheme(initialData.themeColors);
      setExpired(!!initialData.isExpired);
      setLoading(false);
      return;
    }

    if (id) {
      setLoading(true);
      setError(false);
      setExpired(false);

      fetch(`/api/surprise/${encodeURIComponent(id)}`)
        .then(async (res) => {
          if (res.status === 410) {
            throw new Error('EXPIRED');
          }
          if (!res.ok) throw new Error('NOT_FOUND');
          return res.json();
        })
        .then((fetchedData: SurpriseData) => {
          if (fetchedData.isExpired) {
            setExpired(true);
          } else {
            setData(fetchedData);
            applyTheme(fetchedData.themeColors);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error('[SurpriseViewer] Fetch error:', err);
          if (err.message === 'EXPIRED') {
            setExpired(true);
          } else {
            setError(true);
          }
          setLoading(false);
        });
    }
  }, [id, initialData]);

  // Audio setup
  useEffect(() => {
    if (data && bgAudioRef.current) {
      const songSrc = data.musicUrl || '/song.mp3';
      bgAudioRef.current.src = songSrc;
      bgAudioRef.current.load();
    }
  }, [data]);

  // Unlock Web Audio context for mobile devices
  const unlockAudioContext = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
      }
    } catch (e) {}
  };

  const toggleMusic = () => {
    const aud = bgAudioRef.current;
    if (!aud) return;
    if (aud.paused) {
      aud.play().then(() => setIsPlayingMusic(true)).catch(console.error);
    } else {
      aud.pause();
      setIsPlayingMusic(false);
    }
  };

  if (loading) {
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 120 }}>
        <h2>Loading your special surprise…</h2>
        <div style={{ fontSize: 40, margin: '24px 0' }}>💌</div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 100, maxWidth: 520 }}>
        <div style={{ fontSize: 50, marginBottom: 12 }}>⏰</div>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>This E-Card has Expired</h2>
        <p style={{ color: 'var(--mut)', fontSize: 15, lineHeight: 1.6 }}>
          For privacy and temporary storage, e-cards are kept active for <strong>24 hours only</strong>. The media and message for this card have now expired.
        </p>
        <a href="/" className="btn primary" style={{ marginTop: 26, display: 'inline-block' }}>
          Create a New E-Card ✿
        </a>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 100 }}>
        <h2>This link doesn&apos;t look right</h2>
        <p style={{ marginTop: 10, color: 'var(--mut)' }}>
          Ask the sender to share the link again, or create your own special e-card!
        </p>
        <a href="/" className="btn" style={{ marginTop: 24, display: 'inline-block' }}>
          Create an E-Card ✿
        </a>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Background Audio */}
      <audio
        ref={bgAudioRef}
        loop
        preload="auto"
        playsInline
        onPlay={() => setIsPlayingMusic(true)}
        onPause={() => setIsPlayingMusic(false)}
      />

      {/* STEP 1: ENVELOPE */}
      {viewerStep === 1 && (
        <ViewerEnvelope
          data={data}
          onOpenEnvelope={() => {
            unlockAudioContext();
            const aud = bgAudioRef.current;
            const song = data.musicUrl || '/song.mp3';
            if (aud) {
              if (!aud.src || (!aud.src.endsWith(song) && aud.src !== song)) {
                aud.src = song;
                aud.load();
              }
              aud.play().then(() => setIsPlayingMusic(true)).catch((err) => {
                console.warn('Mobile autoplay policy prevented automatic sound:', err);
              });
            }
          }}
          onNext={() => {
            setViewerStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* STEP 2: HERO & PLAYER */}
      {viewerStep === 2 && (
        <ViewerHero
          data={data}
          onNext={() => setViewerStep(3)}
          isPlayingMusic={isPlayingMusic}
          onToggleMusic={toggleMusic}
          audioRef={bgAudioRef}
        />
      )}

      {/* STEP 3: MEMORY WALL */}
      {viewerStep === 3 && (
        <ViewerWall
          data={data}
          onNext={() => {
            setViewerStep(4);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* STEP 4: CERTIFICATE */}
      {viewerStep === 4 && (
        <ViewerCertificate
          data={data}
          onNext={() => {
            setViewerStep(5);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* STEP 5: SCRATCH CARDS */}
      {viewerStep === 5 && (
        <ViewerCoupons
          data={data}
          onNext={() => {
            setViewerStep(6);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* STEP 6: LETTER & VOICE CASSETTE */}
      {viewerStep === 6 && (
        <ViewerLetter
          data={data}
          isViewOnly={true}
          onOpenSaveModal={() => {}}
          onPauseBackgroundMusic={() => {
            if (bgAudioRef.current) bgAudioRef.current.pause();
          }}
          onResumeBackgroundMusic={() => {
            if (bgAudioRef.current && data.musicUrl) {
              bgAudioRef.current.play().catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
