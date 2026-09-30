'use client';

import React, { useState } from 'react';
import { VIRAL_MEME_LIBRARY } from '@/lib/constants';
import { MemeItem } from '@/types/ecard';

interface MemeLibraryModalProps {
  isOpen: boolean;
  activeSlotIndex: number;
  currentSelectedUrl?: string;
  onClose: () => void;
  onSelectMeme: (meme: MemeItem) => void;
}

export const MemeLibraryModal: React.FC<MemeLibraryModalProps> = ({
  isOpen,
  activeSlotIndex,
  currentSelectedUrl,
  onClose,
  onSelectMeme,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  if (!isOpen) return null;

  const filteredMemes =
    activeFilter === 'all'
      ? VIRAL_MEME_LIBRARY
      : activeFilter === 'animated'
      ? VIRAL_MEME_LIBRARY.filter((m) => m.src.endsWith('.gif'))
      : VIRAL_MEME_LIBRARY.filter((m) => m.category === activeFilter);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="meme-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="meme-modal-head">
          <span className="badge-tag">🐾 Wholesome Meme Collection</span>
          <h2>Viral Memes &amp; Animated GIFs ({VIRAL_MEME_LIBRARY.length} Options)</h2>
          <p style={{ fontSize: 13, color: 'var(--mut)', marginTop: 4 }}>
            Click any meme or animated GIF to assign it to <b>Card {activeSlotIndex + 1}</b>
          </p>

          <div className="meme-filter-tabs">
            <button
              type="button"
              className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All ({VIRAL_MEME_LIBRARY.length})
            </button>
            <button
              type="button"
              className={`filter-chip ${activeFilter === 'animated' ? 'active' : ''}`}
              onClick={() => setActiveFilter('animated')}
            >
              ✨ Animated GIFs (9)
            </button>
            <button
              type="button"
              className={`filter-chip ${activeFilter === 'romantic' ? 'active' : ''}`}
              onClick={() => setActiveFilter('romantic')}
            >
              💖 Romantic &amp; Love
            </button>
            <button
              type="button"
              className={`filter-chip ${activeFilter === 'funny' ? 'active' : ''}`}
              onClick={() => setActiveFilter('funny')}
            >
              🤪 Silly &amp; Viral
            </button>
            <button
              type="button"
              className={`filter-chip ${activeFilter === 'cute' ? 'active' : ''}`}
              onClick={() => setActiveFilter('cute')}
            >
              🐶🐱 Animals &amp; Fluff
            </button>
          </div>
        </div>

        <div className="meme-grid">
          {filteredMemes.map((meme) => {
            const isSelected = currentSelectedUrl === meme.src;
            return (
              <div
                key={meme.id}
                className={`meme-item ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onSelectMeme(meme);
                  onClose();
                }}
              >
                <img
                  className="meme-item-img"
                  src={meme.src}
                  alt={meme.title}
                  loading="lazy"
                />
                <div className="meme-item-meta">
                  <span className="meme-item-title">{meme.title}</span>
                  <span className="meme-item-cat">
                    {meme.category} • {meme.caption}
                  </span>
                </div>
                <button type="button" className="meme-select-btn">
                  {isSelected ? '✓ Selected' : `Choose for Card ${activeSlotIndex + 1}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
