'use client';
import { useEffect, useState } from 'react';
import { fetchHistory, fetchIncidents } from '@/lib/api';
import { socket } from '@/lib/socket';
import type { Incident, SensorReading } from '@/types';

const STORAGE_KEY = 'hazardguard:sensor-state';
const STALE_AFTER_MS = 30000;

function normalize(data: any): SensorReading {
  return { ...data, timestamp: data.timestamp || data._time, riskScore: data.riskScore ?? data.risk_score ?? 0, riskLevel: data.riskLevel || data.level || 'SAFE' };
}

export function useSensorData() {
  const [current, setCurrent] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Incident[]>([]);
  const [connected, setConnected] = useState(socket.connected);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        setCurrent(state.current || null); setHistory(state.history || []); setAlerts(state.alerts || []);
      }
    } catch (error) { console.error('Sensor state restore failed:', error); }
    Promise.all([fetchHistory('24h'), fetchIncidents()]).then(([rows, incidents]) => {
      const readings = rows.map(normalize).filter((row) => row.timestamp).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      setHistory(readings.slice(-60)); setCurrent(readings.at(-1) || null); setAlerts(incidents.slice(0, 50));
    }).catch((error) => console.error('Sensor history load failed:', error.message));
  }, []);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onReading = (data: SensorReading) => { const reading = normalize(data); setCurrent(reading); setHistory((items) => [...items.slice(-59), reading]); };
    const onAlert = (alert: Incident) => setAlerts((items) => [alert, ...items.filter((item) => item.id !== alert.id)].slice(0, 50));
    socket.on('connect', onConnect); socket.on('disconnect', onDisconnect); socket.on('sensorUpdate', onReading); socket.on('alert', onAlert);
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('sensorUpdate', onReading); socket.off('alert', onAlert); window.clearInterval(timer); };
  }, []);

  useEffect(() => { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ current, history, alerts })); }, [current, history, alerts]);
  const currentTimestamp = current?.timestamp;
  const live = connected && Boolean(currentTimestamp) && now - Date.parse(currentTimestamp || '') <= STALE_AFTER_MS;
  return { current: live ? current : null, history, alerts, connected, live };
}
