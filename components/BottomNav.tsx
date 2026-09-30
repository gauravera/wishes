'use client';

import React from 'react';

interface BottomNavProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentStep,
  totalSteps,
  onBack,
  onNext,
}) => {
  if (currentStep < 1) return null;

  return (
    <nav className="bottom-nav">
      <button
        type="button"
        className="btn ghost"
        style={{ visibility: currentStep > 1 ? 'visible' : 'hidden' }}
        onClick={onBack}
      >
        ← Back
      </button>

      <div className="dots-indicator">
        {Array.from({ length: totalSteps }, (_, i) => (
          <i key={i} className={i + 1 === currentStep ? 'on' : ''} />
        ))}
      </div>

      <button
        type="button"
        className="btn"
        style={{ visibility: currentStep < 5 ? 'visible' : 'hidden' }}
        onClick={onNext}
      >
        {currentStep === 1 ? 'Open ✉' : 'Next →'}
      </button>
    </nav>
  );
};
