'use client';

import { useSensorStore } from '@/stores/sensorStore';

const labels = {
  connecting: 'Connecting',
  live: 'Live',
  disconnected: 'Disconnected',
  'device-offline': 'Device offline',
} as const;

export function ConnectionPill() {
  const connection = useSensorStore((s) => s.connection);
  const lastAge = useSensorStore((s) => s.lastAge);
  const simulated = useSensorStore((s) => s.simulated);
  const latencyMs = useSensorStore((s) => s.latencyMs);
  return (
    <div className="pill-cluster">
      {simulated && <span className="sim-badge">Simulated data</span>}
      <span className={`conn-pill ${connection}`}>
        <span className="status-dot" />
        {labels[connection]}
        {connection === 'live' && lastAge ? ` · ${lastAge}` : ''}
      </span>
      {latencyMs != null && process.env.NODE_ENV !== 'production' && (
        <span className="latency">{latencyMs} ms</span>
      )}
    </div>
  );
}
