import type { Incident } from '@/types';

export function AlertFeed({ alerts }: { alerts: Incident[] }) {
  if (!alerts.length) return <div className="empty">No incidents. All sensors are within limits.</div>;
  return (
    <div>
      {alerts.slice(0, 12).map((alert) => {
        const severity = alert.severity || alert.type || 'WARNING';
        return (
          <div key={alert.id} className={`alert ${severity.toLowerCase()}`}>
            <strong>{severity} / {alert.sensorField || alert.sensor}</strong>
            <p>{alert.zone} · peak {alert.peakValue ?? alert.value} {alert.unit}</p>
            <small>{new Date(alert.startedAt || alert.createdAt || Date.now()).toLocaleString()}</small>
          </div>
        );
      })}
    </div>
  );
}
