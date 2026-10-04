'use client';

import { create } from 'zustand';
import type { ConnectionState, Incident, SensorReading } from '@/types';
import { thresholds } from '@/config/sensors';

const N = 120;
let raf = 0;
let pending: SensorReading | null = null;

function ageLabel(at: number | null) {
  if (!at) return '';
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  return `${seconds} s ago`;
}

export const useSensorStore = create<{
  current: SensorReading | null;
  history: SensorReading[];
  incidents: Incident[];
  connection: ConnectionState;
  lastMessageAt: number | null;
  lastAge: string;
  simulated: boolean;
  latencyMs: number | null;
  openIncidentCount: number;
  setConnection: (connection: ConnectionState) => void;
  pushReading: (reading: SensorReading) => void;
  upsertIncident: (incident: Incident) => void;
  setIncidents: (incidents: Incident[]) => void;
  tick: () => void;
}>((set, get) => ({
  current: null,
  history: [],
  incidents: [],
  connection: 'connecting',
  lastMessageAt: null,
  lastAge: '',
  simulated: false,
  latencyMs: null,
  openIncidentCount: 0,
  setConnection: (connection) => set({ connection }),
  pushReading: (reading) => {
    pending = {
      ...reading,
      ts: reading.ts || reading.timestamp || new Date().toISOString(),
      drainage: reading.drainage ?? reading.rain ?? 0,
      gas: reading.gas ?? 0,
      smoke: reading.smoke ?? 0,
      heatIndex: reading.heatIndex ?? 0,
      dewPoint: reading.dewPoint ?? 0,
      risk: reading.risk ?? reading.riskScore ?? 0,
      riskScore: reading.riskScore ?? reading.risk ?? 0,
    };
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const next = pending;
      pending = null;
      if (!next) return;
      const latencyMs = next.serverTs && process.env.NODE_ENV !== 'production'
        ? Date.now() - next.serverTs
        : null;
      const history = [...get().history, next].slice(-N);
      set({
        current: next,
        history,
        lastMessageAt: Date.now(),
        lastAge: '0 s ago',
        simulated: Boolean(next.simulated),
        latencyMs,
        connection: 'live',
      });
    });
  },
  upsertIncident: (incident) => set((state) => {
    const incidents = [incident, ...state.incidents.filter((item) => item.id !== incident.id)].slice(0, 100);
    return {
      incidents,
      openIncidentCount: incidents.filter((item) => item.status === 'OPEN' || item.status === 'ACKNOWLEDGED' || (!item.status && !item.resolvedAt)).length,
    };
  }),
  setIncidents: (incidents) => set({
    incidents,
    openIncidentCount: incidents.filter((item) => item.status === 'OPEN' || item.status === 'ACKNOWLEDGED').length,
  }),
  tick: () => {
    const last = get().lastMessageAt;
    const connected = get().connection !== 'disconnected';
    if (!connected) {
      set({ lastAge: ageLabel(last) });
      return;
    }
    if (!last || Date.now() - last > thresholds.deviceOfflineMs) {
      set({ connection: 'device-offline', lastAge: ageLabel(last) });
      return;
    }
    set({ connection: 'live', lastAge: ageLabel(last) });
  },
}));
