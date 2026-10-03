'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SurpriseData } from '@/types/ecard';
import { COUPLE_GIF_ASSETS, getEventMascot } from '@/lib/constants';

interface ViewerHeroProps {
  data: SurpriseData;
  onNext: () => void;
  isPlayingMusic: boolean;
  onToggleMusic: () => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export const ViewerHero: React.FC<ViewerHeroProps> = ({
  data,
  onNext,
  isPlayingMusic,
  onToggleMusic,
  audioRef,
}) => {
  const [minis, setMinis] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const rotatingSlotRef = useRef(0);

  // Initialize 4 mini couple GIFs (2 left, 2 right)
  useEffect(() => {
    const mascot = getEventMascot(data.eventType);
    const pool = COUPLE_GIF_ASSETS.filter((g) => g !== mascot).sort(() => 0.5 - Math.random());
    setMinis([
      mascot,
      pool[0] || '/assets/mini1.gif',
      pool[1] || '/assets/mini2.gif',
      pool[2] || '/assets/mini3.gif',
    ]);
  }, [data.eventType]);

  // Mini GIF Auto rotator
  useEffect(() => {
    const interval = setInterval(() => {
      setMinis((prev) => {
        if (!prev.length) return prev;
        const available = COUPLE_GIF_ASSETS.filter((g) => !prev.includes(g));
        if (!available.length) return prev;
        const nextGif = available[Math.floor(Math.random() * available.length)];
        const nextMinis = [...prev];
        nextMinis[rotatingSlotRef.current] = nextGif;
        rotatingSlotRef.current = (rotatingSlotRef.current + 1) % 4;
        return nextMinis;
      });
    }, 3400);

    return () => clearInterval(interval);
  }, []);

  // Music progress tracking
  useEffect(() => {
    const aud = audioRef?.current;
    if (!aud) return;

    // Immediately read current duration/time if audio is already loaded
    if (aud.duration && isFinite(aud.duration) && aud.duration > 0) {
      setDuration(aud.duration);
      setCurrentTime(aud.currentTime || 0);
    }

    const handleTimeUpdate = () => {
      setCurrentTime(aud.currentTime || 0);
      if (aud.duration && isFinite(aud.duration)) {
        setDuration(aud.duration);
      }
    };

    aud.addEventListener('timeupdate', handleTimeUpdate);
    aud.addEventListener('loadedmetadata', handleTimeUpdate);
    aud.addEventListener('durationchange', handleTimeUpdate);
    aud.addEventListener('canplay', handleTimeUpdate);
    aud.addEventListener('playing', handleTimeUpdate);

    return () => {
      aud.removeEventListener('timeupdate', handleTimeUpdate);
      aud.removeEventListener('loadedmetadata', handleTimeUpdate);
      aud.removeEventListener('durationchange', handleTimeUpdate);
      aud.removeEventListener('canplay', handleTimeUpdate);
      aud.removeEventListener('playing', handleTimeUpdate);
    };
  }, [audioRef]);

  const handleSwapMini = (idx: number) => {
    const available = COUPLE_GIF_ASSETS.filter((g) => !minis.includes(g));
    if (!available.length) return;
    const nextGif = available[Math.floor(Math.random() * available.length)];
    setMinis((prev) => {
      const next = [...prev];
      next[idx] = nextGif;
      return next;
    });
  };

  const formatTime = (t: number) => {
    if (!isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = String(Math.floor(t % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const aud = audioRef?.current;
    if (!aud || !aud.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    aud.currentTime = percent * aud.duration;
  };

  const heroPhoto = data.photos?.[0] || '/p2.jpeg';
  const albumArt = data.photos?.[1] || minis[0] || '/assets/mini1.gif';
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const isBirthday = data.eventType === 'birthday';

  return (
    <div className="sec sec-hero">
      <p className="eyebrow">{data.eventTitle || 'SPECIAL SURPRISE'}</p>
      {isBirthday && (
        <div className="birthday-candle-row" style={{ marginBottom: 8, marginTop: 0 }}>
          <div className="birthday-candle">
            <div className="candle-flame" />
            <div className="candle-wick" />
            <div className="candle-stick pink" />
          </div>
          <div className="birthday-candle">
            <div className="candle-flame" />
            <div className="candle-wick" />
            <div className="candle-stick yellow" />
          </div>
          <div className="birthday-candle">
            <div className="candle-flame" />
            <div className="candle-wick" />
            <div className="candle-stick blue" />
          </div>
        </div>
      )}
      <h1 className="title">{isBirthday ? `Happy Birthday, ${data.receiver}!` : `To ${data.receiver}`}</h1>
      <span className="ribbon">from {data.sender} {isBirthday ? '🎂' : '✿'}</span>

      {/* Main Flank Container: Left Stickers, Center Content, Right Stickers */}
      <div className="hero-flank-container">
        {/* Left Side Stickers */}
        <div className="hero-flank hero-flank-left">
          {minis.slice(0, 2).map((src, idx) => (
            <div
              key={`left-${idx}`}
              className={`mini-card flank-card flank-card-${idx}`}
              onClick={() => handleSwapMini(idx)}
              title="Click to swap animation!"
            >
              <img
                src={src}
                alt="Cute animation"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/mini1.gif';
                }}
              />
            </div>
          ))}
        </div>

        {/* Center Main Content: Polaroid & Message */}
        <div className="hero-center-content">
          <div className="polaroid">
            <img
              src={heroPhoto}
              alt="Memory"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/p2.jpeg';
              }}
            />
          </div>
          <div className="hero-msg">{data.message}</div>
        </div>

        {/* Right Side Stickers */}
        <div className="hero-flank hero-flank-right">
          {minis.slice(2, 4).map((src, idx) => {
            const actualIdx = idx + 2;
            return (
              <div
                key={`right-${actualIdx}`}
                className={`mini-card flank-card flank-card-${actualIdx}`}
                onClick={() => handleSwapMini(actualIdx)}
                title="Click to swap animation!"
              >
                <img
                  src={src}
                  alt="Cute animation"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/mini2.gif';
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Music Player */}
      <div className="player">
        <img
          src={albumArt}
          alt="Album Art"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/assets/mini1.gif';
          }}
        />
        <div className="pm">
          <div className="now">NOW PLAYING</div>
          <h3>{data.songTitle || 'Our Song'}</h3>
          <small>the soundtrack of us</small>
          <div className="ctl">
            <button
              type="button"
              className="play-btn"
              onClick={onToggleMusic}
              aria-label="Play or pause"
            >
              {isPlayingMusic ? '❚❚' : '▶'}
            </button>
            <div className="bar" onClick={handleSeek}>
              <i style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="tm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      <p className="hand" style={{ fontSize: 22, margin: '20px 0 12px' }}>
        {isBirthday
          ? 'press play — your birthday soundtrack awaits 🎉'
          : 'press play — this melody belongs to us ✿'}
      </p>
      <button type="button" className="btn" onClick={onNext}>
        {isBirthday ? 'see your birthday wall →' : 'see our album →'}
      </button>
    </div>
  );
};
