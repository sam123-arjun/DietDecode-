import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'glass' | 'solid' | 'interactive';
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  glow = false,
  className = '',
  ...props
}) => {
  const baseClass =
    variant === 'interactive'
      ? 'glass-panel glass-card-interactive'
      : variant === 'solid'
      ? 'glass-panel'
      : 'glass-panel';

  const glowClass = glow ? 'glow-border' : '';

  return (
    <div
      className={`${baseClass} ${glowClass} ${className}`}
      style={{ padding: '1.25rem 1.5rem', ...props.style }}
      {...props}
    >
      {children}
    </div>
  );
};
