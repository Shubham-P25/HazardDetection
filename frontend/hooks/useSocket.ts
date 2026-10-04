'use client';

import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useSensorStore } from '@/stores/sensorStore';
import { fetchIncidents } from '@/lib/api';

function bindSocket(token?: string | null) {
  const socket = getSocket(token);
  const store = useSensorStore.getState();
  const onConnect = () => {
    if (!store.lastMessageAt) store.setConnection('connecting');
  };
  const onDisconnect = () => store.setConnection('disconnected');
  const onReading = (data: any) => store.pushReading(data);
  const onIncident = (incident: any) => store.upsertIncident(incident);
  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  socket.on('sensor:update', onReading);
  socket.on('sensorUpdate', onReading);
  socket.on('incident:new', onIncident);
  socket.on('incident:update', onIncident);
  socket.on('alert', onIncident);
  if (!socket.connected) socket.connect();
  return () => {
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
    socket.off('sensor:update', onReading);
    socket.off('sensorUpdate', onReading);
    socket.off('incident:new', onIncident);
    socket.off('incident:update', onIncident);
    socket.off('alert', onIncident);
  };
}

export function useSocket(token?: string | null) {
  useEffect(() => {
    const cleanup = bindSocket(token);
    fetchIncidents().then((payload) => {
      const items = Array.isArray(payload) ? payload : payload.items;
      if (items) useSensorStore.getState().setIncidents(items);
    }).catch(() => {});
    const timer = window.setInterval(() => useSensorStore.getState().tick(), 1000);
    return () => { cleanup(); window.clearInterval(timer); };
  }, [token]);
}
