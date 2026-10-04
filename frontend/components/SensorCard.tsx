'use client';

import type { RiskLevel } from '@/types';
import { Sparkline } from '@/components/Sparkline';

const colors: Record<string, string> = {
  safe: '#12805c', warning: '#c58008', danger: '#d45b16', critical: '#c83232',
};

export function SensorCard({
  label, sensor, value, unit, status = 'SAFE', spark, tooltip, calculated, display,
}: {
  label: string;
  sensor: string;
  value?: number;
  unit: string;
  status?: RiskLevel;
  spark: number[];
  tooltip?: string;
  calculated?: boolean;
  display?: string;
}) {
  const chip = status === 'NONE' ? 'SAFE' : status;
  return (
    <article className={`panel sensor-card ${chip.toLowerCase()}`}>
      <div className="sensor-head">
        <span>
          {label}
          {tooltip && <span className="info" title={tooltip} aria-label={tooltip}>i</span>}
        </span>
        <span className="badge">{chip === 'SAFE' ? 'Safe' : chip === 'WARNING' ? 'Warning' : chip === 'DANGER' ? 'Danger' : 'Critical'}</span>
      </div>
      <div className="sensor-source">{sensor}{calculated ? ' · calculated' : ''}</div>
      <div className="reading">{display ?? (value === undefined ? '—' : Number.isInteger(value) ? String(value) : value.toFixed(1))}</div>
      <span className="unit">{unit}</span>
      <Sparkline values={spark} color={colors[chip.toLowerCase()] || colors.safe} />
    </article>
  );
}
