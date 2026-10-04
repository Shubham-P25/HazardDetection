const state = {
  mqttConnected: false,
  mqttTopic: null,
  lastMessageAt: null,
  lastReading: null,
  lastEmitAt: null,
  simulator: false,
  mqttClient: null,
};

function snapshot(io) {
  return {
    mqttConnected: Boolean(state.mqttClient?.connected || state.mqttConnected),
    socketClients: io?.engine?.clientsCount || 0,
    lastMessageAt: state.lastMessageAt,
    simulator: state.simulator,
  };
}

module.exports = { state, snapshot };
