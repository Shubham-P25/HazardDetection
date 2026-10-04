const { calculateRiskScore, getRiskLevel, computeRisk } = require('./riskScore');
const { checkAnomaly } = require('./anomalyClient');
const { writeInflux } = require('../influx');
const { processAlert } = require('./alertEngine');
const { updateCompliance } = require('./compliance');
const { pushThingSpeak } = require('./thingspeak');
const { normalizeReading } = require('./normalizeReading');
const { evaluateStatuses } = require('./statusEngine');
const { state, pushToBuffer } = require('../runtimeState');
const zones = require('../config/zones');

// C7: key drainageWetSince by deviceId
const drainageWetSinceMap = new Map();

function drainageWetMs(deviceId, drainage, now) {
  const key = deviceId || 'default';
  if (!drainage) {
    drainageWetSinceMap.delete(key);
    return 0;
  }
  if (!drainageWetSinceMap.has(key)) drainageWetSinceMap.set(key, now);
  return now - drainageWetSinceMap.get(key);
}

function attachRoomStatuses(reading, statuses) {
  const rooms = {};
  for (const room of zones.rooms) {
    const sensors = zones.sensors.filter((sensor) => sensor.roomId === room.id);
    if (!sensors.length) {
      rooms[room.id] = 'NONE';
      continue;
    }
    rooms[room.id] = sensors.reduce((worst, sensor) => {
      const level = statuses[sensor.field] || 'SAFE';
      const order = { NONE: -1, SAFE: 0, WARNING: 1, DANGER: 2, CRITICAL: 3 };
      return (order[level] || 0) > (order[worst] || 0) ? level : worst;
    }, 'SAFE');
  }
  return rooms;
}

// C4: last known anomaly result – applied on the NEXT reading
let lastAnomaly;

async function processReading(input, { io, prisma }) {
  const reading = normalizeReading(input);
  const devId = reading.deviceId;
  const extra = { drainageWetMs: drainageWetMs(devId, reading.drainage, Date.now()) };
  // C7: keyed by deviceId
  const { statuses, worst } = evaluateStatuses(reading, extra, devId);

  // C4: use one computeRisk function for both live emit and Influx
  const riskScore = computeRisk(reading, statuses, lastAnomaly);
  const riskLevel = worst;

  const data = {
    ...reading,
    statuses,
    roomStatuses: attachRoomStatuses(reading, statuses),
    risk: riskScore,
    riskScore,
    riskLevel,
    anomaly: lastAnomaly,
  };

  state.lastMessageAt = new Date().toISOString();
  state.lastReading = data;
  // C1: push into ring buffer for snapshot
  pushToBuffer(data);

  io?.emit('sensor:update', data);
  io?.emit('sensorUpdate', data);
  state.lastEmitAt = Date.now();

  // C4: fire alerts and Influx IMMEDIATELY, call ML in parallel
  // Do NOT await anomaly before starting alerts
  const persist = async () => {
    // Start these immediately with current statuses
    const alertPromise = processAlert(data, prisma, io).catch((error) => console.error('Alert error:', error.message));
    const compliancePromise = updateCompliance(data, prisma).catch((error) => console.error('Compliance error:', error.message));
    const influxPromise = writeInflux(data).catch((error) => console.error('History write error:', error.message));
    const thingspeakPromise = pushThingSpeak({
      mq2: reading.mq2,
      temperature: reading.temperature,
      humidity: reading.humidity,
      flame: reading.flame,
      rain: reading.drainage,
    });

    // ML runs in parallel; result used for NEXT reading's risk score
    checkAnomaly({
      mq2: reading.mq2,
      temperature: reading.temperature,
      humidity: reading.humidity,
      flame: reading.flame,
      rain: reading.drainage,
    }).then((anomaly) => {
      lastAnomaly = anomaly;
    }).catch((error) => {
      console.error('ML service error:', error.message);
    });

    await Promise.allSettled([alertPromise, compliancePromise, influxPromise, thingspeakPromise]);
  };

  persist().catch((error) => console.error('Background persist error:', error.message));
  return data;
}

module.exports = { processReading, normalizeReading };
