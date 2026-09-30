'use client';

import React, { useRef, useState, useEffect } from 'react';

interface VoiceNoteRecorderProps {
  voiceBlob: Blob | File | null;
  voiceTitle: string;
  voicePromptText: string;
  onVoiceChange: (blob: Blob | File | null) => void;
  onVoiceTitleChange: (title: string) => void;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  voiceBlob,
  voiceTitle,
  voicePromptText,
  onVoiceChange,
  onVoiceTitleChange,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceName, setVoiceName] = useState('Recorded Voice Note');
  const [voiceDurationInfo, setVoiceDurationInfo] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (voiceBlob) {
      const url = URL.createObjectURL(voiceBlob);
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
  }, [voiceBlob]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setRecSeconds(0);
      setIsRecording(true);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        stream.getTracks().forEach((track) => track.stop());
        const finalBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onVoiceChange(finalBlob);
        setVoiceName('Recorded Voice Note');
        setVoiceDurationInfo(`${recSeconds}s recording ready`);
        setIsRecording(false);
        if (!voiceTitle.trim()) {
          onVoiceTitleChange('A special voice note for you');
        }
      };

      recorder.start();

      timerIntervalRef.current = setInterval(() => {
        setRecSeconds((prev) => {
          if (prev >= 59) {
            recorder.stop();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      alert('Microphone access is unavailable or denied. You can also upload an audio memo file instead!');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioRef.current.src) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formattedTimer = () => {
    const m = String(Math.floor(recSeconds / 60)).padStart(2, '0');
    const s = String(recSeconds % 60).padStart(2, '0');
    return `${m}:${s} / 01:00`;
  };

  return (
    <div className="voice-note-section">
      <label>🎙️ Record a Voice Message from Your Heart (Optional)</label>
      <p className="field-hint">{voicePromptText}</p>

      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        preload="auto"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onVoiceChange(f);
            setVoiceName(f.name);
            setVoiceDurationInfo(formatBytes(f.size));
            if (!voiceTitle.trim()) {
              onVoiceTitleChange(f.name.replace(/\.[^/.]+$/, ''));
            }
          }
        }}
      />

      {!voiceBlob && !isRecording && (
        <div className="voice-empty-state">
          <div className="voice-icon">🎙️</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={startRecording}
            >
              🎙️ Record Voice Note
            </button>
            <span style={{ fontSize: 12, color: 'var(--mut)' }}>or</span>
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Upload Audio Memo
            </button>
          </div>
        </div>
      )}

      {isRecording && (
        <div className="rec-pulse-row">
          <span className="rec-dot"></span>
          <span className="rec-timer">{formattedTimer()}</span>
          <div className="rec-wave">
            <i /><i /><i /><i /><i />
          </div>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={stopRecording}
          >
            ⏹ Stop &amp; Save
          </button>
        </div>
      )}

      {voiceBlob && !isRecording && (
        <div className="voice-selected-state">
          <div style={{ fontSize: 26 }}>📼</div>
          <div className="voice-meta">
            <div className="voice-filename">{voiceName}</div>
            <div className="voice-filesize">{voiceDurationInfo || 'Ready to play'}</div>
          </div>
          <div className="voice-controls">
            <button
              type="button"
              className="btn ghost btn-xs"
              onClick={togglePlay}
            >
              {isPlaying ? '❚❚ Pause' : '▶ Play'}
            </button>
            <button
              type="button"
              className="btn ghost btn-xs btn-danger"
              onClick={() => {
                onVoiceChange(null);
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
          value={voiceTitle}
          onChange={(e) => onVoiceTitleChange(e.target.value)}
          maxLength={50}
          placeholder="Voice note caption (optional, e.g. 'Listen when you miss me at 2 AM')"
        />
      </div>
    </div>
  );
};
