'use client';

import React, { useRef, useState } from 'react';
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
  const [loadingSlotIndex, setLoadingSlotIndex] = useState<number | null>(null);

  const handleCustomUpload = (idx: number, file: File) => {
    setLoadingSlotIndex(idx);
    onUploadWallPhoto(idx, file);
    setTimeout(() => {
      setLoadingSlotIndex(null);
    }, 450);
  };

  return (
    <div>
      <div className="wall-slots-grid" style={{ marginTop: 0 }}>
        {wallSlots.map((slot, idx) => {
          const isCustom = slot.type === 'upload';
          const isLoading = loadingSlotIndex === idx;
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

                  {/* Circular Loader for Wall Photo Upload */}
                  {isLoading && (
                    <div className="circular-loader-overlay">
                      <svg className="circular-svg" viewBox="0 0 36 36">
                        <path
                          className="circular-bg"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="circular-meter"
                          strokeDasharray="75, 100"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="circular-percent-text">Uploading</span>
                    </div>
                  )}

                  {isCustom && !isLoading && (
                    <div className="image-uploaded-badge">✓ Custom</div>
                  )}
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
                      if (f) handleCustomUpload(idx, f);
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
