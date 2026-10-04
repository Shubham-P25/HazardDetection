'use client';

import { memo, useMemo, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { zones } from '@/config/zones';
import type { RiskLevel, SensorReading } from '@/types';

const fills: Record<string, { fill: string; stroke: string }> = {
  SAFE: { fill: '#e5f5ed', stroke: '#12805c' },
  WARNING: { fill: '#fff4d6', stroke: '#c58008' },
  DANGER: { fill: '#ffeadf', stroke: '#d45b16' },
  CRITICAL: { fill: '#ffe1e1', stroke: '#c83232' },
  NONE: { fill: '#eef2f5', stroke: '#9aa8b5' },
};

function formatValue(field: string, reading: SensorReading | null) {
  if (!reading) return '—';
  if (field === 'flame') return reading.flame ? 'Detected' : 'Clear';
  if (field === 'drainage') return reading.drainage ? 'Wet' : 'Dry';
  const value = reading[field as keyof SensorReading];
  return typeof value === 'number' ? value.toFixed(1) : '—';
}

export function FloorMap({
  data, history,
}: {
  data: SensorReading | null;
  history: SensorReading[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const roomStatus = (id: string): RiskLevel => data?.roomStatuses?.[id] || 'NONE';
  const selectedRoom = zones.rooms.find((room) => room.id === selected);
  const selectedSensors = zones.sensors.filter((sensor) => sensor.roomId === selected);

  const mini = useMemo(() => {
    if (!selectedSensors[0]) return [];
    const field = selectedSensors[0].field;
    return history.slice(-60).map((row) => ({ t: new Date(row.ts).getTime(), y: Number(row[field as keyof SensorReading]) || 0 }));
  }, [history, selected]);

  return (
    <div className="twin">
      <svg viewBox={zones.viewBox} className="floor" role="img" aria-label="Factory floor plan">
        <rect x="16" y="16" width="1168" height="768" fill="#f7fafc" stroke="#1e3a5f" strokeWidth="6" />
        {zones.rooms.map((room) => {
          const status = room.corridor ? 'NONE' : roomStatus(room.id);
          const style = fills[status] || fills.NONE;
          const sensors = zones.sensors.filter((sensor) => sensor.roomId === room.id);
          return (
            <g key={room.id} className={status === 'CRITICAL' ? 'pulse' : ''} onClick={() => setSelected(room.id)} style={{ cursor: 'pointer' }}>
              <rect x={room.x} y={room.y} width={room.w} height={room.h} fill={style.fill} stroke={style.stroke} strokeWidth="2" rx="4" />
              <text x={room.x + room.w / 2} y={room.y + 28} textAnchor="middle" fill="#132238" fontWeight="700" fontSize="16">{room.name}</text>
              {!sensors.length && <text x={room.x + room.w / 2} y={room.y + room.h / 2 + 8} textAnchor="middle" fill="#6b7b8e" fontSize="13">No sensor</text>}
              {sensors.map((sensor, index) => {
                const cx = room.x + 28 + (index % 4) * 28;
                const cy = room.y + room.h - 28;
                const level = data?.statuses?.[sensor.field] || 'SAFE';
                const mark = fills[level] || fills.SAFE;
                return (
                  <g key={sensor.id}>
                    <title>{sensor.name}: {formatValue(sensor.field, data)}</title>
                    <circle cx={cx} cy={cy} r="8" fill={mark.stroke} stroke="#fff" strokeWidth="1.5" />
                    <text x={cx} y={cy + 3} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">{sensor.label}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {['SAFE', 'WARNING', 'DANGER', 'CRITICAL', 'NONE'].map((item) => (
          <span key={item}><i style={{ background: fills[item].stroke }} />{item === 'NONE' ? 'No sensor' : item[0] + item.slice(1).toLowerCase()}</span>
        ))}
      </div>
      <ul className="sensor-list">
        {zones.sensors.map((sensor) => (
          <li key={sensor.id}>
            <strong>{sensor.name}</strong>
            <span>{zones.rooms.find((room) => room.id === sensor.roomId)?.name}</span>
            <em>{formatValue(sensor.field, data)}</em>
          </li>
        ))}
      </ul>
      {selectedRoom && (
        <aside className="side-panel" role="dialog" aria-label={selectedRoom.name}>
          <button className="action secondary" onClick={() => setSelected(null)}>Close</button>
          <h3>{selectedRoom.name}</h3>
          <p>Status: {roomStatus(selectedRoom.id)}</p>
          {selectedSensors.map((sensor) => (
            <p key={sensor.id}>{sensor.name}: {formatValue(sensor.field, data)}</p>
          ))}
          <div className="mini-chart">
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={mini}>
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="y" stroke="#1663a8" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </aside>
      )}
    </div>
  );
}

export const MemoFloorMap = memo(FloorMap);
