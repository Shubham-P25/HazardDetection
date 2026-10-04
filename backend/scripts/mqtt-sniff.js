/**
 * Hop 1 debug: subscribe to the same MQTT topic as the backend and print payloads.
 * Usage: node scripts/mqtt-sniff.js
 */
require('dotenv').config();
const mqtt = require('mqtt');
const topic = process.env.MQTT_TOPIC
  || (process.env.MQTT_TOPIC_PREFIX ? `${process.env.MQTT_TOPIC_PREFIX.replace(/\/$/, '')}/sensors` : 'hazard/sensors');
const broker = process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com';
const client = mqtt.connect(broker, {
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
});
client.on('connect', () => {
  console.log(`Connected to ${broker}, topic ${topic}`);
  client.subscribe(topic);
});
client.on('message', (received, message) => {
  console.log(new Date().toISOString(), received, message.toString());
});
client.on('error', (error) => console.error(error.message));
