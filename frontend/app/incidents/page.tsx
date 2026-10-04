'use client';

import { useEffect, useMemo, useState } from 'react';
import { acknowledgeAlert, fetchIncidents, resolveIncident } from '@/lib/api';
import { useSensorStore } from '@/stores/sensorStore';
import type { Incident } from '@/types';

function summarizeAlerts(incident: Incident) {
  const alerts = incident.alerts || [];
  if (!alerts.length) return 'None';
  const groups: Record<string, { sent: number; failed: number }> = {};
  for (const alert of alerts) {
    groups[alert.channel] ||= { sent: 0, failed: 0 };
    if (alert.status === 'SENT') groups[alert.channel].sent += 1;
    else groups[alert.channel].failed += 1;
  }
  return Object.entries(groups).map(([channel, count]) => `${channel}: ${count.sent} sent${count.failed ? `, ${count.failed} failed` : ''}`).join('; ');
}

export default function Incidents() {
  const live = useSensorStore((s) => s.incidents);
  const [items, setItems] = useState<Incident[]>([]);
  const [severity, setSeverity] = useState('ALL');
  const [status, setStatus] = useState('OPEN');
  const [from, setFrom] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams();
    if (severity !== 'ALL') params.set('severity', severity);
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    params.set('limit', '20');
    params.set('offset', String(page * 20));
    fetchIncidents(`?${params}`).then((payload) => setItems(payload.items || payload)).catch(() => setItems([]));
  }, [severity, status, from, page, live]);

  const shown = useMemo(() => items, [items]);

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <div className="eyebrow">Operations / response log</div>
          <h1>Incident register</h1>
        </div>
        <div className="filter">
          {['ALL', 'WARNING', 'DANGER', 'CRITICAL'].map((item) => <button key={item} className={severity === item ? 'selected' : ''} onClick={() => setSeverity(item)}>{item}</button>)}
          {['OPEN', 'RESOLVED'].map((item) => <button key={item} className={status === item ? 'selected' : ''} onClick={() => setStatus(item)}>{item}</button>)}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th><th>Sensor</th><th>Zone</th><th>Severity</th><th>Peak value</th><th>Duration</th><th>Alerted</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((incident) => (
                <tr key={incident.id}>
                  <td>{new Date(incident.startedAt || incident.createdAt || '').toLocaleString()}</td>
                  <td>{incident.sensorField || incident.sensor}</td>
                  <td>{incident.zone}</td>
                  <td>{incident.severity || incident.type}</td>
                  <td>{incident.peakValue ?? incident.value} {incident.unit}</td>
                  <td>{incident.resolvedAt ? `${Math.round((new Date(incident.resolvedAt).getTime() - new Date(incident.startedAt).getTime()) / 60000)} min` : 'Open'}</td>
                  <td>
                    <button className="linkish" onClick={() => setOpenId(openId === incident.id ? null : incident.id)}>{summarizeAlerts(incident)}</button>
                  </td>
                  <td>{incident.status || (incident.acknowledged ? 'ACKNOWLEDGED' : 'OPEN')}</td>
                  <td>
                    {incident.status !== 'RESOLVED' && (
                      <>
                        <button className="action secondary" onClick={() => acknowledgeAlert(incident.id)}>Acknowledge</button>
                        <button className="action" onClick={() => resolveIncident(incident.id, note)}>Resolve</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {openId && (
          <div className="drawer">
            {(shown.find((item) => item.id === openId)?.alerts || []).map((alert) => (
              <p key={alert.id}>{alert.channel} · {alert.recipient} · {alert.status} · {new Date(alert.sentAt).toLocaleString()} {alert.error || ''}</p>
            ))}
            <input placeholder="Resolve note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}
        {!shown.length && <div className="empty">No incidents. All sensors are within limits.</div>}
        <div className="range" style={{ marginTop: 12 }}>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
          <button onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </section>
    </main>
  );
}
