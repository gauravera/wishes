'use client';

import React, { useState } from 'react';
import { WitnessType } from '@/types/ecard';

interface AddonsAccordionProps {
  secretQuestion: string;
  secretAnswer: string;
  secretHint: string;
  suggestedQuestion?: string;
  suggestedAnswer?: string;
  suggestedHint?: string;
  onSecretQuestionChange: (val: string) => void;
  onSecretAnswerChange: (val: string) => void;
  onSecretHintChange: (val: string) => void;
  
  scratchCoupons: string[];
  onScratchCouponChange: (index: number, val: string) => void;

  witnessType: WitnessType | string;
  witnessName: string;
  onWitnessTypeChange: (type: WitnessType) => void;
  onWitnessNameChange: (val: string) => void;
  onWitnessPhotoChange: (file: File | null) => void;

  certTitle: string;
  onCertTitleChange: (val: string) => void;
  certTerms: string[];
  onCertTermChange: (index: number, val: string) => void;

  memoryNotes: string[];
  onMemoryNoteChange: (index: number, val: string) => void;
}

export const AddonsAccordion: React.FC<AddonsAccordionProps> = ({
  secretQuestion,
  secretAnswer,
  secretHint,
  suggestedQuestion = 'e.g. Where did we first meet?',
  suggestedAnswer = 'e.g. Cafe Coffee Day',
  suggestedHint = 'e.g. Starts with C...',
  onSecretQuestionChange,
  onSecretAnswerChange,
  onSecretHintChange,
  scratchCoupons,
  onScratchCouponChange,
  witnessType,
  witnessName,
  onWitnessTypeChange,
  onWitnessNameChange,
  onWitnessPhotoChange,
  certTitle,
  onCertTitleChange,
  certTerms,
  onCertTermChange,
  memoryNotes,
  onMemoryNoteChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const witnessList: { key: WitnessType; label: string }[] = [
    { key: 'cat', label: '🐱 The Cat' },
    { key: 'boka', label: '🌸 Boka' },
    { key: 'friend', label: '👯 Bestie' },
    { key: 'cupid', label: '👼 Cupid' },
    { key: 'moon', label: '🌙 The Moon' },
    { key: 'dog', label: '🐶 Good Doggo' },
    { key: 'custom', label: '✨ Custom Witness' },
  ];

  return (
    <div className="accordion">
      <button
        type="button"
        className="acc-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          🎁 Special Add-ons: Secret Passcode, Scratch Coupons &amp; Witness (Optional)
        </span>
        <span>{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen && (
        <div>
          {/* Inside Joke / Passcode Lock */}
          <div className="addon-card">
            <div className="addon-title">🔐 Secret Inside Joke / Passcode Lock (Optional)</div>
            <div className="addon-desc">
              Leave blank for instant opening, or add a question &amp; answer to lock the envelope behind your special memory!
            </div>
            <label style={{ marginTop: 4 }}>Secret Question</label>
            <input
              type="text"
              value={secretQuestion}
              onChange={(e) => onSecretQuestionChange(e.target.value)}
              placeholder={suggestedQuestion}
            />
            <div className="row" style={{ marginTop: 8 }}>
              <div>
                <label>Correct Answer</label>
                <input
                  type="text"
                  value={secretAnswer}
                  onChange={(e) => onSecretAnswerChange(e.target.value)}
                  placeholder={suggestedAnswer}
                />
              </div>
              <div>
                <label>Helpful Hint</label>
                <input
                  type="text"
                  value={secretHint}
                  onChange={(e) => onSecretHintChange(e.target.value)}
                  placeholder={suggestedHint}
                />
              </div>
            </div>
          </div>

          {/* Scratch-Off Love Coupons */}
          <div className="addon-card">
            <div className="addon-title">🎟️ Scratch-Off Love Vouchers &amp; Promises (Optional)</div>
            <div className="addon-desc">
              Interactive scratch-off cards that the recipient rubs with their finger/mouse to reveal your promises!
            </div>
            <div>
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="term-input-row">
                  <span>{idx + 1}.</span>
                  <input
                    type="text"
                    value={scratchCoupons[idx] || ''}
                    onChange={(e) => onScratchCouponChange(idx, e.target.value)}
                    placeholder={`Coupon ${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Official Witness Picker */}
          <div className="addon-card">
            <div className="addon-title">🐾 Official Certificate Witness</div>
            <div className="addon-desc">
              Choose who officially signs as the witness on their certificate!
            </div>
            <div className="witness-options">
              {witnessList.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  className={`witness-chip ${witnessType === w.key ? 'active' : ''}`}
                  onClick={() => onWitnessTypeChange(w.key)}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <div className="row">
              <div>
                <label>Witness Name / Title</label>
                <input
                  type="text"
                  value={witnessName}
                  onChange={(e) => onWitnessNameChange(e.target.value)}
                  placeholder="the cat (official witness)"
                />
              </div>
              <div>
                <label>Witness / Pet Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    onWitnessPhotoChange(f || null);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Certificate Duties & Flip Memories */}
          <div className="addon-card">
            <div className="addon-title">📜 Certificate Duties &amp; Memory Wall Notes</div>
            <label style={{ marginTop: 6 }}>Certificate Title</label>
            <input
              type="text"
              value={certTitle}
              onChange={(e) => onCertTitleChange(e.target.value)}
              placeholder="Certified Boyfriend / Girlfriend / Bestie"
            />

            <label style={{ marginTop: 12 }}>Certificate Duties / Rules (5 terms)</label>
            <div>
              {[0, 1, 2, 3, 4].map((idx) => (
                <div key={idx} className="term-input-row">
                  <span>{idx + 1}.</span>
                  <input
                    type="text"
                    value={certTerms[idx] || ''}
                    onChange={(e) => onCertTermChange(idx, e.target.value)}
                    placeholder={`Duty / Rule #${idx + 1}`}
                  />
                </div>
              ))}
            </div>

            <label style={{ marginTop: 14 }}>Memory Wall Flip Notes (6 cards)</label>
            <div>
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div key={idx} className="term-input-row">
                  <span>{idx + 1}.</span>
                  <input
                    type="text"
                    value={memoryNotes[idx] || ''}
                    onChange={(e) => onMemoryNoteChange(idx, e.target.value)}
                    placeholder={`Note for photo #${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
