'use client';

import { useSensorStore } from '@/stores/sensorStore';
import { FloorMap } from '@/components/FloorMap';

export default function MapPage() {
  const current = useSensorStore((s) => s.current);
  const history = useSensorStore((s) => s.history);
  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <div className="eyebrow">Operations / spatial view</div>
          <h1>Digital twin map</h1>
          <p className="lede">Room color follows only the sensors inside that room. One physical node currently feeds every mapped marker.</p>
        </div>
      </div>
      <section className="panel map-wrap">
        <FloorMap data={current} history={history} />
      </section>
    </main>
  );
}
