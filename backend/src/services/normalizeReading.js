const config = require('../config');
const { convertMq2 } = require('./mq2');
const { dewPointC, heatIndexC } = require('./derived');

function pick(source, keys) {
  return keys.map((key) => source[key]).find((value) => value !== undefined && value !== null && value !== '');
}

function normalizeReading(input) {
  const source = input?.data && typeof input.data === 'object' ? input.data : input;
  if (!source || typeof source !== 'object') throw new Error('Sensor reading must be an object');
  const raw = {
    mq2: pick(source, ['mq2', 'gas_raw', 'gas_ppm']),
    temperature: pick(source, ['temperature', 'temp', 'temperature_c']),
    humidity: pick(source, ['humidity', 'humidity_percent']),
    flame: pick(source, ['flame', 'fire']),
    rain: pick(source, ['rain', 'rain_detected', 'drainage']),
  };
  if (Object.values(raw).some((value) => value === undefined)) {
    throw new Error('Sensor reading is missing one or more required fields');
  }
  const values = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Number(value)]));
  if (!Object.values(values).every(Number.isFinite)) throw new Error('Sensor values must be numeric and finite');
  if (![0, 1].includes(values.flame) || ![0, 1].includes(values.rain)) {
    throw new Error('Flame and rain values must be 0 or 1');
  }

  const flame = config.FLAME_ACTIVE_LOW ? 1 - values.flame : values.flame;
  const drainage = config.RAIN_ACTIVE_LOW ? 1 - values.rain : values.rain;
  const converted = convertMq2(values.mq2);
  const gas = Number.isFinite(Number(source.gas)) && source.mq2 === undefined ? Number(source.gas) : converted.gas;
  const smoke = Number.isFinite(Number(source.smoke)) && source.mq2 === undefined ? Number(source.smoke) : converted.smoke;
  const temperature = values.temperature;
  const humidity = values.humidity;

  return {
    ts: source.ts || source.timestamp || new Date().toISOString(),
    serverTs: Date.now(),
    deviceId: source.deviceId || config.DEFAULT_DEVICE_ID,
    zone: source.zone || null,
    mq2: values.mq2,
    gas,
    smoke,
    temperature,
    humidity,
    flame,
    rain: drainage,
    drainage,
    heatIndex: heatIndexC(temperature, humidity),
    dewPoint: dewPointC(temperature, humidity),
    simulated: Boolean(source.simulated || config.SIMULATOR),
  };
}

module.exports = { normalizeReading };
