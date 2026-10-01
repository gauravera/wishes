'use client';

import React, { useRef, useState } from 'react';

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
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const handleFileChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setLoadingIndex(index);
      onPhotoChange(index, file);
      // Give visual feedback of completion
      setTimeout(() => {
        setLoadingIndex(null);
      }, 400);
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
          const isLoading = loadingIndex === idx;

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

              {/* Ready checkmark badge */}
              {hasPhoto && !isLoading && (
                <div className="image-uploaded-badge">✓ Ready</div>
              )}

              {/* Circular Progress Loader Overlay */}
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
                  <span className="circular-percent-text">Processing</span>
                </div>
              )}

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
