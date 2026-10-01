'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { SurpriseData } from '@/types/ecard';
import { getEventMascot } from '@/lib/constants';
import { BirthdayCakeScene } from '@/components/BirthdayCakeScene';

interface ViewerEnvelopeProps {
  data: SurpriseData;
  onOpenEnvelope: () => void;
  onNext?: () => void;
}

const getUnlockCookieKey = (data: SurpriseData) => {
  const identifier = data.id || `q_${encodeURIComponent((data.secretQuestion || '').trim())}`;
  return `ecard_unlocked_${identifier}`;
};

const isCardUnlocked = (data: SurpriseData): boolean => {
  if (typeof document === 'undefined') return false;
  const key = getUnlockCookieKey(data);
  // Check Cookie
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + key + '=([^;]*)'));
  if (match && match[1] === 'true') return true;
  // Fallback to localStorage
  try {
    if (localStorage.getItem(key) === 'true') return true;
  } catch (e) {
    // Ignore storage issues
  }
  return false;
};

const setCardUnlocked = (data: SurpriseData) => {
  if (typeof document === 'undefined') return;
  const key = getUnlockCookieKey(data);
  // Store Cookie (expires in 365 days)
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `${key}=true; max-age=${maxAge}; path=/; SameSite=Lax`;
  // Also store in localStorage
  try {
    localStorage.setItem(key, 'true');
  } catch (e) {
    // Ignore storage issues
  }
};

export const ViewerEnvelope: React.FC<ViewerEnvelopeProps> = ({
  data,
  onOpenEnvelope,
  onNext,
}) => {
  if (data.eventType === 'birthday') {
    return (
      <BirthdayCakeScene
        data={data}
        onOpenEnvelope={onOpenEnvelope}
        onNext={onNext}
      />
    );
  }

  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [answerInput, setAnswerInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  const mascot = getEventMascot(data.eventType);

  const handleEnvelopeClick = () => {
    if (isOpening) {
      if (onNext) onNext();
      return;
    }

    const hasSecret = Boolean(
      data.secretQuestion &&
        data.secretQuestion.trim() &&
        data.secretAnswer &&
        data.secretAnswer.trim()
    );

    // Only show passcode modal if creator entered a secret question & answer AND not already unlocked
    if (hasSecret && !isCardUnlocked(data)) {
      setShowPasscodeModal(true);
      setAnswerInput('');
      setPasscodeError('');
      return;
    }

    triggerOpen();
  };

  const triggerOpen = () => {
    setIsOpening(true);
    if (onOpenEnvelope) {
      onOpenEnvelope();
    }
    try {
      const birthdayConfettiColors = ['#ff7043', '#ffa000', '#ffeb3b', '#e91e63', '#29b6f6', '#66bb6a'];
      const defaultConfettiColors = ['#e07a5f', '#3f9482', '#e8a44e', '#d85a7f', '#ffffff'];

      confetti({
        particleCount: isBirthday ? 120 : 80,
        spread: isBirthday ? 90 : 70,
        origin: { y: 0.6 },
        colors: isBirthday ? birthdayConfettiColors : defaultConfettiColors,
      });

      // Birthday gets a second burst for extra celebration
      if (isBirthday) {
        setTimeout(() => {
          confetti({
            particleCount: 60,
            spread: 120,
            origin: { y: 0.4, x: 0.3 },
            colors: birthdayConfettiColors,
          });
          confetti({
            particleCount: 60,
            spread: 120,
            origin: { y: 0.4, x: 0.7 },
            colors: birthdayConfettiColors,
          });
        }, 300);
      }
    } catch (e) {
      // Ignore
    }
  };

  const handleUnlock = () => {
    const userAns = answerInput.trim().toLowerCase();
    const target = (data.secretAnswer || '').trim().toLowerCase();

    if (!userAns) {
      setPasscodeError('Please enter an answer!');
      return;
    }

    if (userAns === target || target.includes(userAns) || userAns.includes(target)) {
      setCardUnlocked(data);
      setShowPasscodeModal(false);
      triggerOpen();
    } else {
      setPasscodeError('Not quite! Think about that special memory ✿');
    }
  };

  const isBirthday = data.eventType === 'birthday';

  return (
    <div className="envelope-wrapper">
      {/* Birthday Sparkle Decorations */}
      {isBirthday && (
        <>
          <span className="birthday-sparkle" aria-hidden="true">✨</span>
          <span className="birthday-sparkle" aria-hidden="true">⭐</span>
          <span className="birthday-sparkle" aria-hidden="true">✨</span>
          <span className="birthday-sparkle" aria-hidden="true">⭐</span>
          <span className="birthday-sparkle" aria-hidden="true">✨</span>
        </>
      )}

      {/* Birthday Candle Row */}
      {isBirthday && (
        <div className="birthday-candle-row">
          <div className="birthday-candle">
            <div className="candle-flame" />
            <div className="candle-wick" />
            <div className="candle-stick pink" />
          </div>
          <div className="birthday-candle">
            <div className="candle-flame" />
            <div className="candle-wick" />
            <div className="candle-stick yellow" />
          </div>
          <div className="birthday-candle">
            <div className="candle-flame" />
            <div className="candle-wick" />
            <div className="candle-stick blue" />
          </div>
          <div className="birthday-candle">
            <div className="candle-flame" />
            <div className="candle-wick" />
            <div className="candle-stick green" />
          </div>
          <div className="birthday-candle">
            <div className="candle-flame" />
            <div className="candle-wick" />
            <div className="candle-stick orange" />
          </div>
        </div>
      )}
      <div
        className={`artisan-envelope ${isOpening ? 'opened' : ''}`}
        onClick={handleEnvelopeClick}
      >
        {/* Envelope Back Pocket */}
        <div className="env-back" />

        {/* The Letter Card inside the envelope */}
        <div className="env-letter-card">
          <div className="env-letter-inner">
            <div className="env-letter-header">
              <span className="env-letter-tag">✿ SPECIAL DELIVERY ✿</span>
              <h2 className="env-letter-title">
                {data.envelopeLetterTitle || 'Hey You!'}
              </h2>
              <div className="env-letter-divider" />
            </div>

            <p
              className="env-letter-body"
              dangerouslySetInnerHTML={{
                __html:
                  data.envelopeLetterSub ||
                  'I made a little something<br>just for you...',
              }}
            />

            <div className="env-letter-footer">
              <p className="hand env-letter-event">
                {data.eventTitle || "happy boyfriend's day ✿"}
              </p>
              <span className="env-letter-sig">from {data.sender || 'Me'}</span>
            </div>
          </div>
        </div>

        {/* Envelope Front Pocket & Side Flaps */}
        <div className="env-front-pocket" />
        <div className="env-left-fold" />
        <div className="env-right-fold" />
        <div className="env-bottom-fold" />

        {/* Envelope Top Flap with Wax Seal & Postage Stamp attached */}
        <div className="env-top-flap">
          {/* Perforated Postage Stamp attached to Flap */}
          <div className="postal-stamp">
            <div className="stamp-perforation">
              <span className="stamp-category">
                {data.envelopeStamp || 'FIRST CLASS'}
              </span>
              <span className="stamp-price">♥ LOVE</span>
            </div>
            <div className="stamp-cancellation">
              <div className="postmark-circle">AIR MAIL</div>
              <div className="postmark-lines">
                <i /><i /><i />
              </div>
            </div>
          </div>

          <div className="wax-seal">
            <span className="wax-heart">♥</span>
          </div>
        </div>

        {/* Die-cut Mascot Sticker */}
        <div className="env-mascot-sticker">
          <img
            src={mascot}
            alt="Cute Mascot Sticker"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/cat.gif';
            }}
          />
        </div>
      </div>

      <div className="tap-prompt-container" onClick={handleEnvelopeClick}>
        <span className="tap-sparkle">{isBirthday ? '🎂' : '✨'}</span>
        <p className="tap-prompt">
          {isOpening
            ? 'TAP LETTER OR RIGHT SIDE TO CONTINUE →'
            : isBirthday
              ? 'TAP TO OPEN YOUR BIRTHDAY SURPRISE'
              : 'TAP ENVELOPE TO OPEN'}
        </p>
        <span className="tap-sparkle">{isBirthday ? '🎉' : '✨'}</span>
      </div>

      {/* Secret Passcode Modal */}
      {showPasscodeModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowPasscodeModal(false)}
        >
          <div
            className="passcode-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lock-icon">🔒</div>
            <h2>Locked with Love</h2>
            <p style={{ fontSize: 14, color: 'var(--mut)', marginTop: 4 }}>
              Answer our secret inside joke to open:
            </p>
            <div className="question-badge">{data.secretQuestion}</div>
            {data.secretHint && (
              <div className="passcode-hint">Hint: {data.secretHint}</div>
            )}
            <input
              type="text"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUnlock();
              }}
              placeholder="Your secret answer..."
              autoFocus
            />
            {passcodeError && <div className="passcode-err">{passcodeError}</div>}
            <button
              type="button"
              className="btn"
              style={{ width: '100%', marginTop: 12 }}
              onClick={handleUnlock}
            >
              Unlock 🔓
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
