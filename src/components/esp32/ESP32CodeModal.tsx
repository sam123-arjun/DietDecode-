import React, { useState } from 'react';
import { Copy, Check, Download, Cpu, Cloud, HardDrive, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useESP32 } from '../../context/ESP32Context';

interface ESP32CodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ESP32CodeModal: React.FC<ESP32CodeModalProps> = ({ isOpen, onClose }) => {
  const { getFirmwareCode, deviceId, iotMode } = useESP32();
  const [selectedMode, setSelectedMode] = useState<'firebase' | 'local'>('firebase');
  const [copied, setCopied] = useState<boolean>(false);

  const activeCode = getFirmwareCode(selectedMode);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename =
      selectedMode === 'firebase'
        ? `DietDecode_Firebase_ESP32_${deviceId}.ino`
        : 'DietDecode_LocalREST_ESP32.ino';
    const blob = new Blob([activeCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ESP32 C++ Arduino Firmware Generator"
      maxWidth="850px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Architecture Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: '0.65rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
          <button
            onClick={() => setSelectedMode('firebase')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              border: selectedMode === 'firebase' ? '1px solid #e11d48' : '1px solid #cbd5e1',
              background: selectedMode === 'firebase' ? 'rgba(225, 29, 72, 0.08)' : '#ffffff',
              color: selectedMode === 'firebase' ? '#e11d48' : '#64748b',
              fontWeight: 700,
              fontSize: '0.825rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Cloud size={15} />
            <span>Firebase Cloud IoT (Production)</span>
          </button>

          <button
            onClick={() => setSelectedMode('local')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              border: selectedMode === 'local' ? '1px solid #0284c7' : '1px solid #cbd5e1',
              background: selectedMode === 'local' ? 'rgba(2, 132, 199, 0.08)' : '#ffffff',
              color: selectedMode === 'local' ? '#0284c7' : '#64748b',
              fontWeight: 700,
              fontSize: '0.825rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <HardDrive size={15} />
            <span>Local REST Bridge (Development)</span>
          </button>
        </div>

        {/* Info Banner */}
        <div
          style={{
            background: selectedMode === 'firebase' ? '#fff1f2' : '#f0f9ff',
            border: `1px solid ${selectedMode === 'firebase' ? '#fecdd3' : '#bae6fd'}`,
            borderRadius: '14px',
            padding: '0.85rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Cpu size={18} color={selectedMode === 'firebase' ? '#e11d48' : '#0284c7'} />
            <span style={{ fontSize: '0.825rem', color: '#1e293b' }}>
              Target: <strong>ESP-WROOM-32</strong> | Device ID: <strong>{deviceId}</strong> | OLED (21,22) • Buzzer (23) • Button (18)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopy}
              leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleDownload}
              leftIcon={<Download size={14} />}
            >
              Download .ino
            </Button>
          </div>
        </div>

        {/* Code Preview Block */}
        <div
          style={{
            background: '#0c0f17',
            color: '#f8fafc',
            borderRadius: '14px',
            padding: '1.25rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.785rem',
            lineHeight: 1.6,
            maxHeight: '440px',
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{activeCode}</pre>
        </div>
      </div>
    </Modal>
  );
};
