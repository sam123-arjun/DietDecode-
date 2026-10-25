import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: string;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  trend,
  accentColor = '#8b5cf6',
}) => {
  return (
    <Card variant="interactive" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-darkest)', marginTop: '0.35rem', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {value}
          </div>
          {subValue && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', fontWeight: 500 }}>
              {subValue}
            </div>
          )}
          {trend && (
            <div style={{ fontSize: '0.775rem', color: 'var(--accent-emerald-text)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
              <span>↗</span> {trend}
            </div>
          )}
        </div>

        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '9999px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
};
