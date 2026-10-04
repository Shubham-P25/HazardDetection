'use client';

import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useSensorStore } from '@/stores/sensorStore';
import { fetchIncidents } from '@/lib/api';

export function useSocket() {
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      // C2: call getState() inside handler, not a stale snapshot
      useSensorStore.getState().setSocketConnected(true);
    };

    const onDisconnect = () => {
      useSensorStore.getState().setSocketConnected(false);
    };

    const onConnectError = () => {
      useSensorStore.getState().setSocketConnected(false);
    };

    const onReading = (data: any) => {
      useSensorStore.getState().pushReading(data);
    };

    const onSnapshot = (payload: any) => {
      // C1: seed history and current from server snapshot on connect
      const store = useSensorStore.getState();
      if (payload?.history?.length) {
        store.seedHistory(payload.history);
      }
      if (payload?.current) {
        store.pushReading(payload.current);
      }
    };

    const onIncident = (incident: any) => {
      useSensorStore.getState().upsertIncident(incident);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('sensor:update', onReading);
    socket.on('sensorUpdate', onReading);
    socket.on('sensor:snapshot', onSnapshot);
    socket.on('incident:new', onIncident);
    socket.on('incident:update', onIncident);
    socket.on('alert', onIncident);

    if (!socket.connected) socket.connect();

    // Fetch incidents on mount
    fetchIncidents().then((payload) => {
      const items = Array.isArray(payload) ? payload : payload.items;
      if (items) useSensorStore.getState().setIncidents(items);
    }).catch(() => {});

    // C2/C3: tick only for connection state check - does NOT write lastAge to store
    const timer = window.setInterval(() => useSensorStore.getState().tick(), 1000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('sensor:update', onReading);
      socket.off('sensorUpdate', onReading);
      socket.off('sensor:snapshot', onSnapshot);
      socket.off('incident:new', onIncident);
      socket.off('incident:update', onIncident);
      socket.off('alert', onIncident);
      window.clearInterval(timer);
    };
  }, []); // No deps - socket is a singleton, no token state needed (B5)
}
