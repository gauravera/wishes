'use client';

import React, { useRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface ShareModalProps {
  isOpen: boolean;
  status: 'pay' | 'busy' | 'fail' | 'done';
  errorMessage?: string;
  shareUrl: string;
  surpriseId: string;
  onClose: () => void;
  onUpload: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  status,
  errorMessage,
  shareUrl,
  surpriseId,
  onClose,
  onUpload,
}) => {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'done' && shareUrl && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        shareUrl,
        {
          width: 230,
          margin: 1.5,
          color: {
            dark: '#1b3842',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        },
        (error) => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  }, [status, shareUrl]);

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!shareUrl) return;

    // Check if Native Web Share is available (phones/tablets/supported browsers)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'A Special E-Card Surprise For You 💌',
          text: 'I made a special digital surprise e-card for you! Open the link to unbox it ✿',
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // If user cancelled share sheet, do nothing; if error, fallback to clipboard
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback: Copy link to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  const handleDownloadQR = () => {
    if (qrCanvasRef.current) {
      const a = document.createElement('a');
      a.href = qrCanvasRef.current.toDataURL('image/png');
      a.download = `ecard-qr-${surpriseId ? surpriseId.slice(0, 8) : 'share'}.png`;
      a.click();
    }
  };

  return (
    <div className="modal-backdrop" onClick={status === 'busy' ? undefined : onClose}>
      <div
        className="mbox"
        style={{
          maxWidth: 440,
          padding: '30px 24px 26px',
          textAlign: 'center',
          borderRadius: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {status !== 'busy' && (
          <button className="close-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}

        {status === 'pay' && (
          <div>
            <div style={{ fontSize: 40, marginBottom: 10 }}>💌</div>
            <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Generate Shareable Link &amp; QR</h2>
            <p style={{ color: 'var(--mut)', fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>
              Upload your photos, audio, and personal notes to create a live shareable card with a custom QR code.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(238, 168, 79, 0.15)',
                color: '#9e6211',
                padding: '5px 14px',
                borderRadius: 20,
                fontSize: 12.5,
                fontWeight: 600,
                marginBottom: 20,
              }}
            >
              ⏱️ Valid for 24 hours (Auto-expiring)
            </div>
            <button
              type="button"
              className="btn primary"
              style={{ width: '100%', padding: '12px', fontSize: 16 }}
              onClick={onUpload}
            >
              Generate QR &amp; Link Now →
            </button>
          </div>
        )}

        {status === 'busy' && (
          <div style={{ padding: '24px 0' }}>
            <div style={{ margin: '0 auto 18px', fontSize: 44, animation: 'spin 1.8s linear infinite', display: 'inline-block' }}>
              ⏳
            </div>
            <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Generating Your QR Code…</h2>
            <p style={{ color: 'var(--mut)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              Saving your personalized e-card and preparing your shareable 24-hour QR code.
            </p>
          </div>
        )}

        {status === 'fail' && (
          <div>
            <div style={{ fontSize: 38, marginBottom: 10 }}>⚠️</div>
            <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Upload Failed</h2>
            <p style={{ color: 'var(--mut)', fontSize: 14, margin: '0 0 12px' }}>
              Could not generate your e-card QR code.
            </p>
            {errorMessage && (
              <p style={{ margin: '10px 0 16px', color: '#b3402a', fontSize: 13, background: 'rgba(179,64,42,0.08)', padding: 10, borderRadius: 8 }}>
                {errorMessage}
              </p>
            )}
            <button
              type="button"
              className="btn primary"
              style={{ width: '100%' }}
              onClick={onUpload}
            >
              Try Again ↻
            </button>
          </div>
        )}

        {status === 'done' && (
          <div>
            <div style={{ fontSize: 32, marginBottom: 4 }}>🎉</div>
            <h2 style={{ fontSize: 22, margin: '0 0 4px', fontWeight: 700 }}>Your E-Card is Ready!</h2>
            
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(74, 155, 142, 0.12)',
                color: 'var(--teal-d)',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                margin: '6px auto 14px',
              }}
            >
              ⏱️ Valid for 24 Hours • Temporary Storage
            </div>

            {/* QR Code Canvas */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                margin: '8px auto 16px',
                background: '#ffffff',
                padding: '12px',
                borderRadius: '18px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.07)',
                border: '1px solid var(--line)',
                width: 'fit-content',
              }}
            >
              <canvas ref={qrCanvasRef} style={{ borderRadius: 10, display: 'block' }} />
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--mut)', margin: '0 0 18px', lineHeight: 1.4 }}>
              Scan the QR code with your phone camera or share it directly with your partner!
            </p>

            {/* Exactly Two Action Buttons: Share QR and Download QR */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                width: '100%',
              }}
            >
              <button
                type="button"
                className="btn primary"
                onClick={handleShare}
                style={{
                  padding: '12px 14px',
                  fontSize: 14.5,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {copied ? 'Copied! ✓' : '📤 Share QR'}
              </button>

              <button
                type="button"
                className="btn ghost"
                onClick={handleDownloadQR}
                style={{
                  padding: '12px 14px',
                  fontSize: 14.5,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                💾 Download QR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
