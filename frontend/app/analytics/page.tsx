'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchCompliance, fetchHistory, fetchHazards, exportSheets } from '@/lib/api';
import { LiveChart } from '@/components/LiveChart';
import { useSensorStore } from '@/stores/sensorStore';
import type { ComplianceRecord } from '@/types';

const ranges = [
  { id: '1h', label: 'Last hour', ms: 3600000 },
  { id: '24h', label: '24 hours', ms: 86400000 },
  { id: '7d', label: '7 days', ms: 7 * 86400000 },
  { id: '30d', label: '30 days', ms: 30 * 86400000 },
  { id: 'custom', label: 'Custom', ms: 0 },
];

const charts = [
  { title: 'Risk score', field: 'riskScore', color: '#7a4f9e', unit: '' },
  { title: 'Gas', field: 'gas', color: '#1663a8', unit: 'ppm' },
  { title: 'Smoke', field: 'smoke', color: '#5b6b7a', unit: 'ppm' },
  { title: 'Temperature', field: 'temperature', color: '#d45b16', unit: '°C' },
  { title: 'Humidity', field: 'humidity', color: '#12805c', unit: '%' },
  { title: 'Flame events', field: 'flame', color: '#c83232', unit: '' },
  { title: 'Drainage', field: 'drainage', color: '#2b6cb0', unit: '' },
  { title: 'Heat index', field: 'heatIndex', color: '#b45309', unit: '°C' },
  { title: 'Dew point', field: 'dewPoint', color: '#0f766e', unit: '°C' },
];

function toCsv(rows: any[]) {
  if (!rows.length) return 'timestamp\n';
  const keys = Object.keys(rows[0]);
  return [keys.join(','), ...rows.map((row) => keys.map((key) => JSON.stringify(row[key] ?? '')).join(','))].join('\n');
}

export default function Analytics() {
  const [range, setRange] = useState('24h');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<ComplianceRecord[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [exportState, setExportState] = useState<{ loading?: boolean; url?: string; error?: string }>({});
  const live = useSensorStore((s) => s.history);

  useEffect(() => {
    const queryRange = range === 'custom' ? '24h' : range;
    fetchHistory(queryRange).then(setHistory).catch(() => setHistory([]));
    fetchCompliance().then(setCompliance).catch(() => setCompliance([]));
    fetchHazards().then((payload) => setHazards(payload.items || [])).catch(() => setHazards([]));
  }, [range, from, to]);

  const merged = useMemo(() => {
    const older = history.map((item) => ({
      ...item,
      ts: item.timestamp || item._time,
      riskScore: item.riskScore ?? item.risk ?? item.risk_score,
      drainage: item.drainage ?? item.rain,
    }));
    return [...older, ...live].filter((row) => row.ts);
  }, [history, live]);

  const series = (field: string) => merged.map((item) => ({
    t: new Date(item.ts).getTime(),
    y: item[field] == null ? null : Number(item[field]),
  }));

  async function onExport() {
    setExportState({ loading: true });
    try {
      const response = await exportSheets({ from: from || undefined, to: to || undefined, range });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Export failed');
      const payload = await response.json();
      setExportState({ url: payload.url });
    } catch (error: any) {
      setExportState({ error: error.message || 'sheet not shared with the service account' });
    }
  }

  function downloadCsv() {
    const blob = new Blob([toCsv(merged)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'hazardguard-export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <div className="eyebrow">Operations / trends</div>
          <h1>Historical analytics</h1>
        </div>
        <div className="range">
          {ranges.map((item) => <button key={item.id} className={range === item.id ? 'selected' : ''} onClick={() => setRange(item.id)}>{item.label}</button>)}
        </div>
      </div>
      {range === 'custom' && (
        <div className="range" style={{ marginBottom: 16 }}>
          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      )}
      <div className="export-row">
        <button className="action" disabled={exportState.loading} onClick={onExport}>{exportState.loading ? 'Exporting…' : 'Export to Google Sheets'}</button>
        {exportState.url && <a className="action secondary" href={exportState.url} target="_blank" rel="noreferrer">Open in Google Sheets</a>}
        {exportState.error && <span className="export-error">{exportState.error}</span>}
        {exportState.error && <button className="action secondary" onClick={downloadCsv}>Download CSV</button>}
      </div>
      <div className="grid chart-grid">
        {charts.map((chart) => (
          <LiveChart
            key={chart.field}
            title={chart.title}
            unit={chart.unit}
            color={chart.color}
            data={series(chart.field)}
            emptyLabel={`No data for this range yet (${range})`}
          />
        ))}
      </div>
      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-title"><h2>Safety compliance log</h2><span className="unit">LAST 30 DAYS</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Zone</th><th>Safe minutes</th><th>Unsafe minutes</th><th>Compliance %</th></tr></thead>
            <tbody>
              {compliance.map((record) => (
                <tr key={record.id}>
                  <td>{new Date(record.date).toLocaleDateString()}</td>
                  <td>{record.zone}</td>
                  <td>{record.safeMinutes}m</td>
                  <td>{record.unsafeMinutes}m</td>
                  <td>{record.compliancePct ?? record.safePercentage}%</td>
                </tr>
              ))}
              {!compliance.length && <tr><td colSpan={5}>Compliance appears after the first full day of data.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-title"><h2>Hazard logs</h2><span className="unit">pending reference</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Time</th><th>Zone</th><th>Sensor</th><th>Value</th><th>Severity</th><th>Duration</th><th>Acknowledged by</th></tr></thead>
            <tbody>
              {hazards.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.startedAt).toLocaleString()}</td>
                  <td>{item.zone}</td>
                  <td>{item.sensorField}</td>
                  <td>{item.peakValue} {item.unit}</td>
                  <td>{item.severity}</td>
                  <td>{item.resolvedAt ? `${Math.round((new Date(item.resolvedAt).getTime() - new Date(item.startedAt).getTime()) / 60000)} min` : 'Open'}</td>
                  <td>{item.acknowledgedByClerkId || '—'}</td>
                </tr>
              ))}
              {!hazards.length && <tr><td colSpan={7}>No threshold crossings yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
