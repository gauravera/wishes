'use client';

import React from 'react';
import { EventType } from '@/types/ecard';

interface EventPickerProps {
  currentEvent: EventType;
  onSelectEvent: (event: EventType) => void;
}

export const EventPicker: React.FC<EventPickerProps> = ({
  currentEvent,
  onSelectEvent,
}) => {
  const events: { key: EventType; label: string; icon: string }[] = [
    { key: 'boyfriend', label: "Boyfriend's Day", icon: '👦' },
    { key: 'girlfriend', label: "Girlfriend's Day", icon: '👧' },
    { key: 'bestfriend', label: 'Best Friend', icon: '👯' },
    { key: 'valentines', label: "Valentine's", icon: '❤️' },
    { key: 'missyou', label: 'I Miss You', icon: '✈️' },
    { key: 'anniversary', label: 'Anniversary', icon: '💍' },
    { key: 'birthday', label: 'Birthday', icon: '🎂' },
    { key: 'custom', label: 'Custom', icon: '✨' },
  ];

  return (
    <div className="event-picker">
      {events.map((ev) => (
        <button
          key={ev.key}
          type="button"
          className={`event-btn ${currentEvent === ev.key ? 'active' : ''}`}
          onClick={() => onSelectEvent(ev.key)}
        >
          <span className="event-btn-icon">{ev.icon}</span>
          <span className="event-btn-text">{ev.label}</span>
        </button>
      ))}
    </div>
  );
};
