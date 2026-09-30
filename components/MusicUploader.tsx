'use client';

import React, { useRef, useState, useEffect } from 'react';

interface MusicUploaderProps {
  selectedSongFile: File | null;
  songTitle: string;
  onSongChange: (file: File | null) => void;
  onSongTitleChange: (title: string) => void;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const MusicUploader: React.FC<MusicUploaderProps> = ({
  selectedSongFile,
  songTitle,
  onSongChange,
  onSongTitleChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (selectedSongFile) {
      const url = URL.createObjectURL(selectedSongFile);
      if (audioRef.current) {
        audioRef.current.src = url;
      }
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      setIsPlaying(false);
    }
  }, [selectedSongFile]);

  const togglePlay = () => {
    if (!audioRef.current || !audioRef.current.src) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleFile = (file: File) => {
    if (file.type.startsWith('audio/') || /\.(mp3|m4a|wav|aac|ogg|opus|flac)$/i.test(file.name)) {
      onSongChange(file);
      if (!songTitle) {
        onSongTitleChange(file.name.replace(/\.[^/.]+$/, ''));
      }
    } else {
      alert('Please upload a valid audio file (e.g. MP3, M4A, WAV).');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`music-upload-section ${isDragOver ? 'dragover' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <label>🎵 Custom Background Song / Music (Optional)</label>
      <p className="field-hint">
        Upload your favorite couple song, romantic melody, or acoustic track.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        preload="auto"
      />

      {!selectedSongFile ? (
        <div className="song-empty-state">
          <div className="song-icon">🎵</div>
          <div>
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Choose Audio File
            </button>
            <div className="song-subhint">or drag &amp; drop audio file here</div>
          </div>
        </div>
      ) : (
        <div className="song-selected-state">
          <div className="song-disc-icon">💿</div>
          <div className="song-meta">
            <div className="song-filename">{selectedSongFile.name}</div>
            <div className="song-filesize">{formatBytes(selectedSongFile.size)}</div>
          </div>
          <div className="song-controls">
            <button
              type="button"
              className="btn ghost btn-xs"
              onClick={togglePlay}
            >
              {isPlaying ? '❚❚ Pause' : '▶ Listen'}
            </button>
            <button
              type="button"
              className="btn ghost btn-xs btn-danger"
              onClick={() => {
                onSongChange(null);
                setIsPlaying(false);
              }}
            >
              ✕ Remove
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <input
          type="text"
          value={songTitle}
          onChange={(e) => onSongTitleChange(e.target.value)}
          maxLength={50}
          placeholder="Song title on player (optional, e.g. 'Our Song' or 'Until I Found You')"
        />
      </div>
    </div>
  );
};
