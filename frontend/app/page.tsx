'use client';

import { sensorCards } from '@/config/sensors';
import { useSensorStore } from '@/stores/sensorStore';
import { SensorCard } from '@/components/SensorCard';
import { RiskGauge } from '@/components/RiskGauge';
import { AlertFeed } from '@/components/AlertFeed';
import { LiveChart } from '@/components/LiveChart';
import type { SensorField } from '@/types';

function displayFor(field: string, value?: number) {
  if (value === undefined) return undefined;
  if (field === 'flame') return value ? 'Detected' : 'Clear';
  if (field === 'drainage') return value ? 'Wet' : 'Dry';
  return undefined;
}

export default function Dashboard() {
  const current = useSensorStore((s) => s.current);
  const history = useSensorStore((s) => s.history);
  const incidents = useSensorStore((s) => s.incidents);
  const lastAge = useSensorStore((s) => s.lastAge);
  const connection = useSensorStore((s) => s.connection);

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <div className="eyebrow">Operations / live monitor</div>
          <h1>Hazard control center</h1>
          <p className="lede">Eight live fields from one plant node. Last updated {connection === 'live' ? lastAge || 'just now' : '—'}</p>
        </div>
      </div>
      <div className="grid sensors sensors-8">
        {sensorCards.map((card) => {
          const field = card.field as SensorField;
          const value = current?.[field];
          return (
            <SensorCard
              key={card.field}
              label={card.name}
              sensor={card.source}
              value={typeof value === 'number' ? value : undefined}
              unit={card.unit}
              status={current?.statuses?.[field] || 'SAFE'}
              spark={history.map((row) => Number(row[field]) || 0).slice(-60)}
              tooltip={'tooltip' in card ? card.tooltip : undefined}
              calculated={'calculated' in card && card.calculated}
              display={displayFor(card.field, typeof value === 'number' ? value : undefined)}
            />
          );
        })}
      </div>
      <div className="grid dashboard-grid">
        <section className="panel">
          <div className="panel-title"><h2>Composite risk</h2><span className="unit">BACKEND</span></div>
          <RiskGauge score={current?.riskScore ?? 0} level={current?.riskLevel ?? 'SAFE'} />
          {current?.anomaly?.is_anomaly && <div className="alert warning"><strong>AI ANOMALY DETECTED</strong><p>{current.anomaly.message}</p></div>}
        </section>
        <section className="panel">
          <div className="panel-title"><h2>Alert feed</h2><span className="unit">{incidents.length} recent</span></div>
          <AlertFeed alerts={incidents} />
        </section>
      </div>
      <div className="grid chart-grid">
        <LiveChart title="Gas" unit="ppm" color="#1663a8" data={history.map((row) => ({ t: new Date(row.ts).getTime(), y: row.gas }))} />
        <LiveChart title="Smoke" unit="ppm" color="#5b6b7a" data={history.map((row) => ({ t: new Date(row.ts).getTime(), y: row.smoke }))} />
        <LiveChart title="Temperature" unit="°C" color="#d45b16" data={history.map((row) => ({ t: new Date(row.ts).getTime(), y: row.temperature }))} />
        <LiveChart title="Humidity" unit="%" color="#12805c" data={history.map((row) => ({ t: new Date(row.ts).getTime(), y: row.humidity }))} />
      </div>
    </main>
  );
}
