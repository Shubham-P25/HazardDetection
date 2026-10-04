'use client';

import { memo } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';

export const LiveChart = memo(function LiveChart({
  title, data, color, unit, emptyLabel,
}: {
  title: string;
  data: { t: number; y: number | null }[];
  color: string;
  unit: string;
  emptyLabel?: string;
}) {
  const has = data.some((point) => point.y != null);
  return (
    <div className="panel chart-box">
      <div className="panel-title"><h2>{title}</h2><span className="unit">{unit}</span></div>
      {!has ? <div className="empty">{emptyLabel || 'No data for this range yet'}</div> : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data}>
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
            <YAxis width={40} />
            <Tooltip labelFormatter={(v) => new Date(Number(v)).toLocaleString()} />
            <Area type="monotone" dataKey="y" stroke={color} fill={color} fillOpacity={0.12} connectNulls={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="y" stroke={color} dot={false} connectNulls={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});
