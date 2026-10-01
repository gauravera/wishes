'use client';

import React, { useState } from 'react';
import { SurpriseData } from '@/types/ecard';
import { EVENT_PRESETS } from '@/lib/constants';

interface ViewerWallProps {
  data: SurpriseData;
  onNext?: () => void;
}

export const ViewerWall: React.FC<ViewerWallProps> = ({ data, onNext }) => {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const preset =
    EVENT_PRESETS[data.eventType as keyof typeof EVENT_PRESETS] ||
    EVENT_PRESETS.boyfriend;

  const wallPhotosList =
    data.wallPhotos && data.wallPhotos.length === 6
      ? data.wallPhotos
      : [1, 2, 3, 4, 5, 6].map((i) => `/library/viral_${i}.jpg`);

  const memoriesList =
    data.memoryNotes && data.memoryNotes.length === 6
      ? data.memoryNotes
      : preset.memories;

  const toggleFlip = (idx: number) => {
    setFlipped((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const isBirthday = data.eventType === 'birthday';

  return (
    <div className="sec">
      <p className="eyebrow">
        {isBirthday ? 'YOUR BIRTHDAY WALL' : 'THE MEMORY WALL'}
      </p>
      <h2 className="title sub">
        {isBirthday ? 'every year, a new memory' : 'flip one over'}
      </h2>
      <p className="hand" style={{ fontSize: 26 }}>
        {isBirthday
          ? 'tap a photo — there\'s a birthday note behind each one 🎂'
          : 'every photo has something written on the back ✿'}
      </p>

      <div className="wall-grid">
        {wallPhotosList.map((url, idx) => {
          const isFlipped = !!flipped[idx];
          return (
            <div
              key={idx}
              className={`flip-card ${isFlipped ? 'on' : ''}`}
              onClick={() => toggleFlip(idx)}
            >
              <div className="pin" />
              <div className="flip-card-inner">
                <div className="flip-card-front">
                  <img
                    src={url}
                    alt={`Memory ${idx + 1}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `/library/viral_${idx + 1}.jpg`;
                    }}
                  />
                </div>
                <div className="flip-card-back">
                  {memoriesList[idx] || 'A precious memory ✿'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {onNext && (
        <div style={{ marginTop: 36 }}>
          <button type="button" className="btn" onClick={onNext}>
            {isBirthday ? 'see your birthday certificate →' : 'see certificate →'}
          </button>
        </div>
      )}
    </div>
  );
};
