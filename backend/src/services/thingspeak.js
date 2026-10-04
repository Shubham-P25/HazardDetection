const axios = require('axios');
const config = require('../config');
let lastSentAt = 0;

async function pushThingSpeak({ mq2, temperature, humidity, flame, rain }) {
  if (!config.THINGSPEAK_WRITE_KEY) return;
  if (Date.now() - lastSentAt < config.THINGSPEAK_INTERVAL_MS) return;
  lastSentAt = Date.now();
  try {
    await axios.get('https://api.thingspeak.com/update', { params: { api_key: config.THINGSPEAK_WRITE_KEY, field1: mq2, field2: temperature, field3: humidity, field4: flame, field5: rain } });
  } catch (error) { lastSentAt = 0; console.error('ThingSpeak error:', error.message); }
}
module.exports = { pushThingSpeak };
