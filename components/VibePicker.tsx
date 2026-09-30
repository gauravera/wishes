'use client';

import React from 'react';
import { VibeType } from '@/types/ecard';

interface VibePickerProps {
  currentVibe: VibeType;
  onSelectVibe: (vibe: VibeType) => void;
}

export const VibePicker: React.FC<VibePickerProps> = ({
  currentVibe,
  onSelectVibe,
}) => {
  const vibes: { key: VibeType; label: string; icon: string }[] = [
    { key: 'romantic', label: 'Romantic', icon: '❤️' },
    { key: 'playful', label: 'Playful', icon: '🎉' },
    { key: 'nostalgic', label: 'Nostalgic', icon: '🌌' },
    { key: 'wholesome', label: 'Wholesome', icon: '🌸' },
    { key: 'funny', label: 'Funny', icon: '🤪' },
  ];

  return (
    <div className="vibe-row">
      <span className="vibe-label">VIBE:</span>
      {vibes.map((v) => (
        <button
          key={v.key}
          type="button"
          className={`vibe-btn ${currentVibe === v.key ? 'active' : ''}`}
          onClick={() => onSelectVibe(v.key)}
        >
          <span>{v.icon}</span>
          <span>{v.label}</span>
        </button>
      ))}
    </div>
  );
};
