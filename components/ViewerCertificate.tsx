'use client';

import React, { useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { SurpriseData } from '@/types/ecard';
import { EVENT_PRESETS, getEventMascot } from '@/lib/constants';

interface ViewerCertificateProps {
  data: SurpriseData;
  onNext?: () => void;
}

export const ViewerCertificate: React.FC<ViewerCertificateProps> = ({ data, onNext }) => {
  const certRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const preset =
    EVENT_PRESETS[data.eventType as keyof typeof EVENT_PRESETS] ||
    EVENT_PRESETS.boyfriend;

  const termsList =
    data.certificateTerms && data.certificateTerms.length
      ? data.certificateTerms
      : preset.certificate.terms;

  const rawWitness = data.witnessName || preset.certificate.witness || 'the cat';
  const witnessName = rawWitness.toLowerCase().includes('(official witness)')
    ? rawWitness
    : `${rawWitness} (official witness)`;
  const witnessAvatar = data.witnessPhotoUrl || getEventMascot(data.eventType);
  const certPhoto = data.photos?.[0] || '/p1.jpeg';

  const handleDownload = async () => {
    if (!certRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `certificate-${data.receiver || 'official'}.png`;
      link.click();
      confetti({ particleCount: 50, spread: 60 });
    } catch (e) {
      console.error('Certificate capture failed:', e);
      alert("Couldn't download directly. A screenshot works beautifully too!");
    } finally {
      setIsDownloading(false);
    }
  };

  const isBirthday = data.eventType === 'birthday';

  return (
    <div className="sec sec-cert" style={{ maxWidth: 640 }}>
      <p className="eyebrow" style={{ color: '#d48b70', letterSpacing: '0.15em' }}>
        {isBirthday ? '🎉 BIRTHDAY HONORS 🎉' : 'OFFICIALLY OFFICIAL'}
      </p>
      <h2 className="title sub" style={{ margin: '4px 0 20px' }}>
        {isBirthday ? 'your official birthday certificate' : 'the official certificate'}
      </h2>

      <div ref={certRef} className="cert-card">
        <div className="cert-inner-frame">
          {/* Official Seal Badge in top-right */}
          <div className="cert-seal-badge">
            <div className="cert-seal-inner">
              <span>OFFICIAL</span>
              <span>SEAL</span>
            </div>
          </div>

          <p className="cert-category-tag">
            {data.certificateBadge || preset.certificate.badge || 'CERTIFICATE OF BOYFRIENDSHIP'}
          </p>
          <h2 className="cert-title-main">
            {data.certificateTitle || preset.certificate.title || 'Certified Boyfriend'}
          </h2>

          <p className="cert-certify-label">This is to certify that</p>

          <div className="cert-recipient-box">
            <span className="cert-recipient-name">{data.receiver}</span>
            <div className="cert-recipient-line" />
          </div>

          <div className="cert-avatar-wrap">
            <img
              className="cert-avatar-img"
              src={certPhoto}
              alt={data.receiver}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/p1.jpeg';
              }}
            />
          </div>

          <p className="cert-duties-intro">
            {data.certificateSub ||
              preset.certificate.sub ||
              'is hereby the one and only official boyfriend, with these lifelong duties:'}
          </p>

          <ul className="cert-duties-list">
            {termsList.map((term, i) => (
              <li key={i} className="cert-duty-item">
                <span className="cert-duty-flower">✿</span>
                <span className="cert-duty-text">{term}</span>
              </li>
            ))}
          </ul>

          <div className="cert-signatures-grid">
            <div className="cert-sig-col">
              <span className="cert-sig-hand">{data.sender}</span>
              <div className="cert-sig-underline" />
              <small className="cert-sig-label">issued with love by</small>
            </div>

            <div className="cert-sig-col">
              <div className="cert-witness-row">
                <img
                  className="cert-witness-thumb"
                  src={witnessAvatar}
                  alt="Witness"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/cat.gif';
                  }}
                />
                <span className="cert-sig-hand">
                  {witnessName}
                </span>
              </div>
              <div className="cert-sig-underline" />
              <small className="cert-sig-label">official witness</small>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22, textAlign: 'center' }}>
        <button
          type="button"
          className="btn cert-download-btn"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? 'Making it…' : 'Download certificate ↓'}
        </button>
      </div>

      {onNext && (
        <div style={{ marginTop: 36 }}>
          <button type="button" className="btn primary" onClick={onNext}>
            {isBirthday ? 'unwrap your birthday gifts →' : 'see special promises →'}
          </button>
        </div>
      )}
    </div>
  );
};
