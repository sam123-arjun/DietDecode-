import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Cpu,
  BarChart3,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useDiet } from '../context/DietContext';
import { ReminderHistoryItem } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { formatTime12Hour } from '../utils/timeUtils';

export const ReminderHistoryPage: React.FC = () => {
  const { history, loading } = useDiet();
  const [filter, setFilter] = useState<'all' | 'completed' | 'missed'>('all');

  if (loading && !history.length) {
    return <LoadingSpinner message="Retrieving reminder event logs..." />;
  }

  const completed = history.filter((h) => h.status === 'completed');
  const missed = history.filter((h) => h.status === 'missed');
  const total = history.length;
  const adherenceRate = total > 0 ? Math.round((completed.length / total) * 100) : 100;

  // Average acknowledgment latency
  const latencies = completed.map((h) => h.latencySeconds || 15);
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 14;

  const filteredHistory = history.filter((item) => {
    if (filter === 'completed') return item.status === 'completed';
    if (filter === 'missed') return item.status === 'missed';
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Reminder History & Adherence"
        subtitle="Historical verification of meal timing alerts and physical button acknowledgements."
      />

      {/* Analytics Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        <StatCard
          label="Total Logged Alerts"
          value={total}
          subValue="Tracked by DietDecode"
          icon={<History size={20} />}
          accentColor="#0c0f17"
        />

        <StatCard
          label="Completed on Time"
          value={completed.length}
          subValue="Acknowledged meals"
          icon={<CheckCircle2 size={20} />}
          accentColor="#059669"
        />

        <StatCard
          label="Missed Reminders"
          value={missed.length}
          subValue="Unacknowledged grace period"
          icon={<AlertTriangle size={20} />}
          accentColor="#e11d48"
        />

        <StatCard
          label="Adherence Rate"
          value={`${adherenceRate}%`}
          subValue={`Avg Response: ${avgLatency}s`}
          icon={<BarChart3 size={20} />}
          accentColor="#7c3aed"
        />
      </div>

      {/* Segmented Filter Pills (WayPilot Tabs Design) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="segmented-pill-container">
          <button
            onClick={() => setFilter('all')}
            className={`segmented-pill-btn ${filter === 'all' ? 'active' : ''}`}
          >
            All Events ({history.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`segmented-pill-btn ${filter === 'completed' ? 'active' : ''}`}
          >
            Completed ({completed.length})
          </button>
          <button
            onClick={() => setFilter('missed')}
            className={`segmented-pill-btn ${filter === 'missed' ? 'active' : ''}`}
          >
            Missed ({missed.length})
          </button>
        </div>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Synced with ESP32 Hardware Interrupts
        </span>
      </div>

      {/* History Items List */}
      {filteredHistory.length === 0 ? (
        <EmptyState
          icon={<History size={32} />}
          title="No Logs in This Category"
          description="There are currently no recorded reminder events matching your filter."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredHistory.map((item) => {
            const isCompleted = item.status === 'completed';
            return (
              <div
                key={item.id}
                className="card-waypilot"
                style={{
                  padding: '1.4rem 1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: isCompleted ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${isCompleted ? '#a7f3d0' : '#fecdd3'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCompleted ? '#059669' : '#e11d48',
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-darkest)', margin: 0 }}>
                        {item.mealName}
                      </h4>
                      <span className={`badge ${isCompleted ? 'chip-completed' : 'chip-rose'}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <span>Scheduled: <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatTime12Hour(item.time)}</strong></span>
                      {item.acknowledgedAt && (
                        <>
                          <span>•</span>
                          <span>Acknowledged: <strong style={{ fontFamily: 'var(--font-mono)' }}>{new Date(item.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                        </>
                      )}
                      {isCompleted && item.latencySeconds !== undefined && (
                        <>
                          <span>•</span>
                          <span>Response: <strong>{item.latencySeconds}s</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-darkest)' }}>
                    {item.deviceAcknowledged ? 'ESP32 Physical Button (GPIO 18)' : 'Web App Interface'}
                  </div>
                  <div>{item.date}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
