'use client';

import { memo } from 'react';

export const Sparkline = memo(function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length) return <svg className="spark" viewBox="0 0 120 28" aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 120;
    const y = 26 - ((value - min) / span) * 24;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="spark" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
});
