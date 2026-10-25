import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
}) => {
  return (
    <div
      className="card-waypilot"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        margin: '1.5rem 0',
        borderStyle: 'dashed',
        borderColor: '#cbd5e1',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7c3aed',
          marginBottom: '1.25rem',
        }}
      >
        {icon}
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-darkest)' }}>
        {title}
      </h3>

      <p style={{ maxWidth: '420px', color: 'var(--text-secondary)', fontSize: '0.925rem', marginBottom: actionText ? '1.5rem' : '0' }}>
        {description}
      </p>

      {actionText && onAction && (
        <Button variant="primary" onClick={onAction} leftIcon={actionIcon}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
