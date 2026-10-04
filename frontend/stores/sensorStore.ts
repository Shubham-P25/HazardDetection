'use client';

import { create } from 'zustand';
import type { ConnectionState, Incident, SensorReading } from '@/types';

const N = 120; // ring buffer size
let raf = 0;
let pending: SensorReading | null = null;

// C2: derive connection state from socket connection + last message time
const DEVICE_OFFLINE_MS = 10_000;

function deriveConnection(socketConnected: boolean, lastMessageAt: number | null): ConnectionState {
  if (!socketConnected) return 'disconnected';
  if (!lastMessageAt) return 'connecting';
  if (Date.now() - lastMessageAt > DEVICE_OFFLINE_MS) return 'device-offline';
  return 'live';
}

export const useSensorStore = create<{
  current: SensorReading | null;
  history: SensorReading[];
  incidents: Incident[];
  connection: ConnectionState;
  socketConnected: boolean;    // C2: explicit socket connected flag
  lastMessageAt: number | null;
  simulated: boolean;
  latencyMs: number | null;
  openIncidentCount: number;
  setSocketConnected: (connected: boolean) => void;
  setConnection: (connection: ConnectionState) => void;
  pushReading: (reading: SensorReading) => void;
  seedHistory: (readings: SensorReading[]) => void;  // C1
  upsertIncident: (incident: Incident) => void;
  setIncidents: (incidents: Incident[]) => void;
  tick: () => void;
}>((set, get) => ({
  current: null,
  history: [],
  incidents: [],
  connection: 'connecting',
  socketConnected: false,
  lastMessageAt: null,
  simulated: false,
  latencyMs: null,
  openIncidentCount: 0,

  // C2: set socketConnected and immediately derive connection
  setSocketConnected: (socketConnected) => set((state) => ({
    socketConnected,
    connection: deriveConnection(socketConnected, state.lastMessageAt),
  })),

  // Kept for compatibility
  setConnection: (connection) => set({ connection }),

  pushReading: (reading) => {
    pending = {
      ...reading,
      ts: reading.ts || reading.timestamp || new Date().toISOString(),
      // C3: use null for missing values so chart lines break properly
      drainage: reading.drainage ?? reading.rain ?? null,
      gas: reading.gas ?? null,
      smoke: reading.smoke ?? null,
      heatIndex: reading.heatIndex ?? null,
      dewPoint: reading.dewPoint ?? null,
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
      const lastMessageAt = Date.now();
      set({
        current: next,
        history,
        lastMessageAt,
        simulated: Boolean(next.simulated),
        latencyMs,
        // C2: derive connection immediately
        connection: deriveConnection(get().socketConnected, lastMessageAt),
      });
    });
  },

  // C1: seed history from server snapshot without overwriting newer readings
  seedHistory: (readings) => set((state) => {
    if (state.history.length > 0) return {}; // already seeded by live data
    const seeded = readings.slice(-N).map((r: any) => ({
      ...r,
      ts: r.ts || r.timestamp || new Date().toISOString(),
      drainage: r.drainage ?? r.rain ?? null,
      gas: r.gas ?? null,
      smoke: r.smoke ?? null,
      heatIndex: r.heatIndex ?? null,
      dewPoint: r.dewPoint ?? null,
      risk: r.risk ?? r.riskScore ?? 0,
      riskScore: r.riskScore ?? r.risk ?? 0,
    }));
    return { history: seeded, current: seeded[seeded.length - 1] || state.current };
  }),

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

  // C3: tick only updates connection state - no lastAge (moved to ConnectionPill local state)
  tick: () => {
    const { socketConnected, lastMessageAt } = get();
    set({ connection: deriveConnection(socketConnected, lastMessageAt) });
  },
}));
