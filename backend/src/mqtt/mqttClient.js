const mqtt = require('mqtt');
const config = require('../config');
const { processReading } = require('../services/readingPipeline');
const { state } = require('../runtimeState');

function setupMQTT(io, prisma) {
  if (!config.MQTT_ENABLED) {
    console.warn('MQTT_ENABLED is false; live hardware will not arrive unless SIMULATOR=true');
    return null;
  }
  const client = mqtt.connect(config.MQTT_BROKER, {
    username: config.MQTT_USERNAME || undefined,
    password: config.MQTT_PASSWORD || undefined,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    clientId: `hazardguard-backend-${Math.random().toString(16).slice(2, 10)}`,
  });
  state.mqttClient = client;
  state.mqttTopic = config.MQTT_TOPIC;
  client.on('connect', () => {
    state.mqttConnected = true;
    console.log(`MQTT connected: ${config.MQTT_BROKER}, subscribing to ${config.MQTT_TOPIC}`);
    client.subscribe(config.MQTT_TOPIC, (error) => {
      if (error) console.error('MQTT subscription error:', error.message);
    });
  });
  client.on('offline', () => { state.mqttConnected = false; });
  client.on('close', () => { state.mqttConnected = false; });
  client.on('message', async (topic, message) => {
    const payloadText = message.toString();
    console.log(`[mqtt] ${topic} ${payloadText}`);
    try {
      const payload = JSON.parse(payloadText);
      await processReading(payload, { io, prisma });
    } catch (error) {
      console.error('MQTT message error:', error.message, payloadText);
    }
  });
  client.on('error', (error) => console.error('MQTT error:', error.message));
  return client;
}

module.exports = { setupMQTT };
