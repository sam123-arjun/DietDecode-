import React from 'react';
import { ReminderStatus } from '../../types';

interface BadgeProps {
  status: ReminderStatus | 'online' | 'offline';
  label?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, label, size = 'md' }) => {
  const statusLabels: Record<string, string> = {
    upcoming: '○ Upcoming',
    active: '🔔 Active Alert',
    completed: '✓ Completed',
    missed: '✕ Missed',
    online: '● Device Online',
    offline: '○ Device Offline',
  };

  const displayText = label || statusLabels[status] || status;
  const statusClass = `badge-${status}`;
  const sizeStyle = size === 'sm' ? { fontSize: '0.7rem', padding: '0.15rem 0.5rem' } : {};

  return (
    <span className={`badge ${statusClass}`} style={sizeStyle}>
      {displayText}
    </span>
  );
};
