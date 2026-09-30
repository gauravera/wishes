'use client';

import React, { useRef } from 'react';
import { WallSlot } from '@/types/ecard';

interface WallSlotsGridProps {
  wallSlots: WallSlot[];
  onOpenMemeModal: (slotIndex: number) => void;
  onUploadWallPhoto: (slotIndex: number, file: File) => void;
  onResetSlot: (slotIndex: number) => void;
  onNoteChange: (slotIndex: number, note: string) => void;
  onShuffleMemes?: () => void;
  onResetAllMemes?: () => void;
}

export const WallSlotsGrid: React.FC<WallSlotsGridProps> = ({
  wallSlots,
  onOpenMemeModal,
  onUploadWallPhoto,
  onResetSlot,
  onNoteChange,
}) => {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <div>
      <div className="wall-slots-grid" style={{ marginTop: 0 }}>
        {wallSlots.map((slot, idx) => {
          const isCustom = slot.type === 'upload';
          const badgeLabel = isCustom ? '📷 Custom Photo' : `Meme #${slot.memeId || idx + 1}`;

          return (
            <div key={idx} className="wall-slot-card">
              <div className="slot-preview-wrap">
                <div
                  className="slot-preview-polaroid"
                  title="Click to swap meme / image"
                  onClick={() => onOpenMemeModal(idx)}
                >
                  <img
                    className="slot-preview-img"
                    src={slot.url}
                    alt={`Card ${idx + 1}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `/library/viral_${idx + 1}.jpg`;
                    }}
                  />
                </div>
                <span className="slot-badge-type" title={slot.title}>
                  {slot.title}
                </span>
              </div>

              <div className="slot-details">
                <div className="slot-header-row">
                  <span className="slot-card-num">Card {idx + 1}</span>
                  <span className="badge-tag" style={{ fontSize: 10, padding: '1px 6px', margin: 0 }}>
                    {badgeLabel}
                  </span>
                </div>

                <textarea
                  className="slot-note-area"
                  value={slot.note}
                  onChange={(e) => onNoteChange(idx, e.target.value)}
                  placeholder={`Note written on back of card ${idx + 1}...`}
                />

                <div className="slot-btn-row">
                  <button
                    type="button"
                    className="btn ghost btn-xs"
                    onClick={() => onOpenMemeModal(idx)}
                  >
                    ✨ Pick Meme
                  </button>
                  <button
                    type="button"
                    className="btn ghost btn-xs"
                    onClick={() => fileInputRefs.current[idx]?.click()}
                  >
                    📤 Upload Photo
                  </button>
                  {isCustom && (
                    <button
                      type="button"
                      className="btn ghost btn-xs btn-danger"
                      onClick={() => onResetSlot(idx)}
                      title="Revert to default viral meme"
                    >
                      ✕ Reset
                    </button>
                  )}
                  <input
                    ref={(el) => {
                      fileInputRefs.current[idx] = el;
                    }}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadWallPhoto(idx, f);
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
