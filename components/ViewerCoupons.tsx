'use client';

import React, { useRef, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { SurpriseData } from '@/types/ecard';
import { EVENT_PRESETS } from '@/lib/constants';

interface ViewerCouponsProps {
  data: SurpriseData;
  onNext?: () => void;
}

export const ViewerCoupons: React.FC<ViewerCouponsProps> = ({ data, onNext }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [revealedSet, setRevealedSet] = useState<number[]>([]);
  const [poppedCoupon, setPoppedCoupon] = useState<{ text: string; idx: number } | null>(null);

  const preset =
    EVENT_PRESETS[data.eventType as keyof typeof EVENT_PRESETS] ||
    EVENT_PRESETS.boyfriend;

  const coupons =
    data.scratchCoupons && data.scratchCoupons.length
      ? data.scratchCoupons
      : preset.scratchCoupons;

  const activeCoupons = coupons.slice(0, 3);

  const handleRevealComplete = (idx: number, text: string) => {
    setRevealedSet((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
    setPoppedCoupon({ text, idx });
  };

  const [copiedShare, setCopiedShare] = useState(false);

  const handleShareVoucher = async (voucherText: string) => {
    const senderName = data.sender || 'you';
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareMessage = `Hey ${senderName}! Look what I just scratched & unlocked on the special e-card you sent me: “${voucherText}” 🎟️💖`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Promise Unlocked 🎟️💖`,
          text: shareMessage,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${shareMessage}\n${shareUrl}`);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      } catch (e) {
        console.error('Clipboard copy failed:', e);
      }
    }
  };

  const allRevealed = activeCoupons.every((_, idx) => revealedSet.includes(idx));

  return (
    <div className="sec sec-coupons">
      <p className="eyebrow">SCRATCH TO REVEAL</p>
      <h1 className="title" style={{ fontSize: 'clamp(28px, 6vw, 44px)', margin: '4px 0 10px' }}>
        Special Love Promise
      </h1>
      <p className="hand" style={{ fontSize: 24, color: 'var(--teal-d)', marginBottom: 24 }}>
        {selectedIdx === null
          ? 'click a voucher to pick it & start scratching ✿'
          : 'rub with your finger or mouse to scratch & reveal ✿'}
      </p>

      {/* Scratch Grid */}
      <div className={`scratch-stage-grid ${selectedIdx !== null ? 'has-picked-card' : ''}`}>
        {activeCoupons.map((coupon, idx) => {
          const isSelected = selectedIdx === idx;
          const isHidden = selectedIdx !== null && selectedIdx !== idx;
          const isClaimed = revealedSet.includes(idx);

          return (
            <SingleScratchCard
              key={idx}
              idx={idx}
              text={coupon}
              isSelected={isSelected}
              isHidden={isHidden}
              isClaimed={isClaimed}
              hasAnySelected={selectedIdx !== null}
              onCardClick={() => {
                if (selectedIdx === null) {
                  setSelectedIdx(idx);
                }
              }}
              onRevealComplete={(text) => handleRevealComplete(idx, text)}
            />
          );
        })}
      </div>

      {/* Celebration Pop-Up Modal on 70% Scratched */}
      {poppedCoupon && (
        <div
          className="scratch-modal-overlay"
          onClick={() => {
            setPoppedCoupon(null);
          }}
        >
          <div className="scratch-modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="close-x"
              onClick={() => setPoppedCoupon(null)}
              aria-label="Close"
              style={{ top: 12, right: 14 }}
            >
              ✕
            </button>
            <div className="scratch-modal-ribbon">✨ PROMISE UNLOCKED ✨</div>
            <div className="scratch-modal-badge">VOUCHER #{poppedCoupon.idx + 1}</div>
            <div className="scratch-modal-quote">
              “{poppedCoupon.text}”
            </div>
            <p className="scratch-modal-sub">
              This special promise is sealed and officially redeemable anytime! 💖
            </p>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                className="btn primary full"
                style={{ fontSize: 15, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => handleShareVoucher(poppedCoupon.text)}
              >
                {copiedShare ? 'Copied to Clipboard! ✓' : '📤 Share them to know what you got'}
              </button>

              {onNext && (
                <button
                  type="button"
                  className="btn ghost full"
                  style={{ fontSize: 13.5, padding: '9px 14px' }}
                  onClick={() => {
                    setPoppedCoupon(null);
                    if (onNext) onNext();
                  }}
                >
                  Read Your Letter →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {onNext && (
        <div style={{ marginTop: 44 }}>
          <button type="button" className="btn primary" onClick={onNext}>
            read your letter →
          </button>
        </div>
      )}
    </div>
  );
};

interface SingleScratchCardProps {
  idx: number;
  text: string;
  isSelected: boolean;
  isHidden: boolean;
  isClaimed: boolean;
  hasAnySelected: boolean;
  onCardClick: () => void;
  onRevealComplete: (text: string) => void;
}

const SingleScratchCard: React.FC<SingleScratchCardProps> = ({
  idx,
  text,
  isSelected,
  isHidden,
  isClaimed,
  hasAnySelected,
  onCardClick,
  onRevealComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isRevealedRef = useRef(isClaimed);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    isRevealedRef.current = isClaimed;
  }, [isClaimed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isClaimed || !isSelected) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const renderFoil = (w: number, h: number) => {
      canvas.width = w;
      canvas.height = h;

      // Draw metallic silver luxury gradient foil
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#e5ebe8');
      grad.addColorStop(0.3, '#c8d3ce');
      grad.addColorStop(0.7, '#afbcb6');
      grad.addColorStop(1, '#97a69f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle border pattern inside foil
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      // Decorative labels
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 4;
      ctx.fillText(`🎟️ VOUCHER #${idx + 1}`, w / 2, h / 2 - 12);

      ctx.font = '600 11.5px Inter, sans-serif';
      ctx.fillText('✨ RUB WITH FINGER TO SCRATCH ✨', w / 2, h / 2 + 14);
      ctx.shadowBlur = 0;
    };

    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.round(rect.width) || 380;
      const h = Math.round(rect.height) || 240;
      renderFoil(w, h);
    };

    updateDimensions();
    const timer = setTimeout(updateDimensions, 60);

    let isDrawing = false;
    let strokeCount = 0;

    const check70Percent = () => {
      if (isRevealedRef.current || !ctx || !canvas) return;
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        let cleared = 0;
        const step = 16; // sample every 4th pixel
        let total = 0;
        for (let i = 3; i < data.length; i += step) {
          total++;
          if (data[i] === 0) cleared++;
        }
        const ratio = cleared / total;
        if (ratio >= 0.70) {
          isRevealedRef.current = true;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          try {
            confetti({
              particleCount: 55,
              spread: 65,
              origin: { y: 0.6 },
              colors: ['#3f9482', '#d49540', '#e06d53', '#f4a261', '#e76f51'],
            });
          } catch (err) {}
          onRevealComplete(text);
        }
      } catch (err) {}
    };

    const drawScratchLine = (x0: number, y0: number, x1: number, y1: number) => {
      ctx.globalCompositeOperation = 'destination-out';
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const step = 6;
      for (let i = 0; i <= dist; i += step) {
        const cx = x0 + Math.cos(angle) * i;
        const cy = y0 + Math.sin(angle) * i;
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const getPos = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - r.left,
        y: clientY - r.top,
      };
    };

    const scratch = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing || isRevealedRef.current) return;
      const pos = getPos(e);
      if (lastPointRef.current) {
        drawScratchLine(lastPointRef.current.x, lastPointRef.current.y, pos.x, pos.y);
      } else {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 26, 0, Math.PI * 2);
        ctx.fill();
      }
      lastPointRef.current = pos;

      strokeCount++;
      if (strokeCount % 3 === 0) {
        check70Percent();
      }
    };

    const handleDown = (e: MouseEvent | TouchEvent) => {
      if (isRevealedRef.current) return;
      isDrawing = true;
      lastPointRef.current = getPos(e);
      scratch(e);
    };

    const handleUp = () => {
      isDrawing = false;
      lastPointRef.current = null;
      if (!isRevealedRef.current) {
        check70Percent();
      }
    };

    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mousemove', scratch);
    window.addEventListener('mouseup', handleUp);

    canvas.addEventListener('touchstart', handleDown);
    canvas.addEventListener('touchmove', scratch);
    window.addEventListener('touchend', handleUp);

    return () => {
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('mousemove', scratch);
      window.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('touchstart', handleDown);
      canvas.removeEventListener('touchmove', scratch);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isSelected, isClaimed]);

  let cardClasses = 'scratch-voucher-card';
  if (isSelected) cardClasses += ' is-picked-solo';
  if (isHidden) cardClasses += ' is-hidden-away';
  if (isClaimed) cardClasses += ' is-claimed-voucher';

  return (
    <div
      className={cardClasses}
      onClick={() => {
        if (!hasAnySelected) {
          onCardClick();
        }
      }}
    >
      <div className="scratch-voucher-inner">
        {isClaimed && <span className="voucher-claimed-tag">Claimed ✨</span>}
        <span className="voucher-num-pill">VOUCHER #{idx + 1}</span>
        <div className="scratch-voucher-text">{text}</div>
      </div>

      {!isClaimed && isSelected && (
        <canvas ref={canvasRef} className="scratch-canvas" />
      )}

      {!isClaimed && !hasAnySelected && (
        <div className="voucher-unpicked-cover">
          <span className="voucher-unpicked-icon">🎟️</span>
          <span className="voucher-unpicked-title">VOUCHER #{idx + 1}</span>
          <span className="voucher-unpicked-sub">Tap To Scratch ✨</span>
        </div>
      )}
    </div>
  );
};
