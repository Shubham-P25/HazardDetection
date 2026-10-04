'use client';

import { useEffect, useState } from 'react';
import { useSensorStore } from '@/stores/sensorStore';

const labels = {
  connecting: 'Connecting',
  live: 'Live',
  disconnected: 'Disconnected',
  'device-offline': 'Device offline',
} as const;

// C3: local setInterval for age label - does not trigger global re-renders
function useAgeLabel(lastMessageAt: number | null) {
  const [age, setAge] = useState('');
  useEffect(() => {
    const update = () => {
      if (!lastMessageAt) { setAge(''); return; }
      const s = Math.max(0, Math.round((Date.now() - lastMessageAt) / 1000));
      setAge(`${s} s ago`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [lastMessageAt]);
  return age;
}

export function ConnectionPill() {
  const connection = useSensorStore((s) => s.connection);
  const lastMessageAt = useSensorStore((s) => s.lastMessageAt);
  const simulated = useSensorStore((s) => s.simulated);
  const latencyMs = useSensorStore((s) => s.latencyMs);
  const age = useAgeLabel(lastMessageAt);

  return (
    <div className="pill-cluster">
      {simulated && <span className="sim-badge">Simulated data</span>}
      <span className={`conn-pill ${connection}`}>
        <span className="status-dot" />
        {labels[connection]}
        {connection === 'live' && age ? ` · ${age}` : ''}
      </span>
      {latencyMs != null && process.env.NODE_ENV !== 'production' && (
        <span className="latency">{latencyMs} ms</span>
      )}
    </div>
  );
}
