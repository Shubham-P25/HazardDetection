// Ring buffer size for sensor history (C1)
const BUFFER_SIZE = 120;

const state = {
  mqttConnected: false,
  mqttTopic: null,
  lastMessageAt: null,
  lastReading: null,
  lastEmitAt: null,
  simulator: false,
  mqttClient: null,
  // C1: last 120 readings for snapshot on new socket connection
  readingBuffer: [],
};

function pushToBuffer(reading) {
  state.readingBuffer.push(reading);
  if (state.readingBuffer.length > BUFFER_SIZE) {
    state.readingBuffer.shift();
  }
}

function snapshot(io) {
  return {
    mqttConnected: Boolean(state.mqttClient?.connected || state.mqttConnected),
    socketClients: io?.engine?.clientsCount || 0,
    lastMessageAt: state.lastMessageAt,
    simulator: state.simulator,
  };
}

module.exports = { state, snapshot, pushToBuffer };
