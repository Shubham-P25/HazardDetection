const config = require('../config');
const { convertMq2 } = require('./mq2');
const { dewPointC, heatIndexC } = require('./derived');

// C5: keep last good DHT11 values per device
const lastGoodDht = new Map(); // deviceId -> { temperature, humidity, at }

function pick(source, keys) {
  return keys.map((key) => source[key]).find((value) => value !== undefined && value !== null && value !== '');
}

function isFiniteNumber(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

// C5: check physically impossible DHT11 values
function isValidTemperature(t) { return Number.isFinite(t) && t >= -10 && t <= 80; }
function isValidHumidity(h)    { return Number.isFinite(h) && h >= 0 && h <= 100; }

function normalizeReading(input) {
  const source = input?.data && typeof input.data === 'object' ? input.data : input;
  if (!source || typeof source !== 'object') throw new Error('Sensor reading must be an object');

  // C5: mq2, flame, rain are still required
  const rawMq2  = pick(source, ['mq2', 'gas_raw', 'gas_ppm']);
  const rawFlame = pick(source, ['flame', 'fire']);
  const rawRain  = pick(source, ['rain', 'rain_detected', 'drainage']);

  if (rawMq2 === undefined || rawFlame === undefined || rawRain === undefined) {
    throw new Error('Sensor reading is missing required fields: mq2, flame, rain');
  }

  const mq2  = Number(rawMq2);
  const flameRaw = Number(rawFlame);
  const rainRaw  = Number(rawRain);

  if (!Number.isFinite(mq2))                         throw new Error('mq2 must be numeric and finite');
  if (![0, 1].includes(flameRaw))                    throw new Error('flame must be 0 or 1');
  if (![0, 1].includes(rainRaw))                     throw new Error('rain must be 0 or 1');

  const flame    = config.FLAME_ACTIVE_LOW ? 1 - flameRaw : flameRaw;
  const drainage = config.RAIN_ACTIVE_LOW  ? 1 - rainRaw  : rainRaw;

  const converted = convertMq2(mq2);
  const gas   = Number.isFinite(Number(source.gas))   && source.mq2 === undefined ? Number(source.gas)   : converted.gas;
  const smoke = Number.isFinite(Number(source.smoke)) && source.mq2 === undefined ? Number(source.smoke) : converted.smoke;

  // C5: temperature and humidity may be missing or invalid
  const rawTemp = pick(source, ['temperature', 'temp', 'temperature_c']);
  const rawHum  = pick(source, ['humidity', 'humidity_percent']);
  const tempCandidate = rawTemp !== undefined ? Number(rawTemp) : null;
  const humCandidate  = rawHum  !== undefined ? Number(rawHum)  : null;

  const deviceId = source.deviceId || config.DEFAULT_DEVICE_ID;
  const prevDht  = lastGoodDht.get(deviceId);

  let temperature, humidity, dhtStale = false, dhtAgeMs = null;

  const tempGood = tempCandidate !== null && isValidTemperature(tempCandidate);
  const humGood  = humCandidate  !== null && isValidHumidity(humCandidate);

  if (tempGood && humGood) {
    temperature = tempCandidate;
    humidity    = humCandidate;
    lastGoodDht.set(deviceId, { temperature, humidity, at: Date.now() });
  } else {
    dhtStale = true;
    if (prevDht) {
      temperature = prevDht.temperature;
      humidity    = prevDht.humidity;
      dhtAgeMs    = Date.now() - prevDht.at;
    } else {
      temperature = null;
      humidity    = null;
    }
  }

  // Only compute derived values when both are available
  const hi  = (temperature !== null && humidity !== null) ? heatIndexC(temperature, humidity) : null;
  const dew = (temperature !== null && humidity !== null) ? dewPointC(temperature, humidity)   : null;

  return {
    ts:          source.ts || source.timestamp || new Date().toISOString(),
    serverTs:    Date.now(),
    deviceId,
    zone:        source.zone || null,
    mq2,
    gas,
    smoke,
    temperature,
    humidity,
    flame,
    rain: drainage,
    drainage,
    heatIndex: hi,
    dewPoint:  dew,
    dhtStale,
    dhtAgeMs,
    simulated: Boolean(source.simulated || config.SIMULATOR),
  };
}

module.exports = { normalizeReading };
