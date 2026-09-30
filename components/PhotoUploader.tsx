'use client';

import React, { useRef } from 'react';

interface PhotoUploaderProps {
  photos: (File | null)[];
  previewUrls: string[];
  onPhotoChange: (index: number, file: File) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  previewUrls,
  onPhotoChange,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleFileChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      console.log('Selected photo:', {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      onPhotoChange(index, file);
    }

    // Allow selecting the same file again.
    e.target.value = '';
  };

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
        Add your 3 favorite photos together
      </label>

      <div className="pics-grid">
        {[0, 1, 2].map((idx) => {
          const hasPhoto = !!previewUrls[idx];

          return (
            <div
              key={idx}
              className={`pic-box ${hasPhoto ? 'has' : ''}`}
              style={{ position: 'relative' }}
            >
              <input
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                id={`photo-upload-${idx}`}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(idx, e)}
                style={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  opacity: 0,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                }}
              />

              <button
                type="button"
                onClick={() => inputRefs.current[idx]?.click()}
                aria-label={`Choose photo ${idx + 1}`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  padding: 0,
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {hasPhoto ? (
                  <img
                    src={previewUrls[idx]}
                    alt={`Photo ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <span>+ Photo {idx + 1}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
