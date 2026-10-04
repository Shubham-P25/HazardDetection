const { calculateRiskScore, getRiskLevel } = require('./riskScore');
const { checkAnomaly } = require('./anomalyClient');
const { writeInflux } = require('../influx');
const { processAlert } = require('./alertEngine');
const { updateCompliance } = require('./compliance');
const { pushThingSpeak } = require('./thingspeak');
const { normalizeReading } = require('./normalizeReading');
const { evaluateStatuses } = require('./statusEngine');
const { state } = require('../runtimeState');
const zones = require('../config/zones');

const drainageWetSince = { at: null };

function drainageWetMs(drainage, now) {
  if (!drainage) {
    drainageWetSince.at = null;
    return 0;
  }
  drainageWetSince.at ||= now;
  return now - drainageWetSince.at;
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

async function processReading(input, { io, prisma }) {
  const reading = normalizeReading(input);
  const extra = { drainageWetMs: drainageWetMs(reading.drainage, Date.now()) };
  const { statuses, worst } = evaluateStatuses(reading, extra);
  const riskScore = calculateRiskScore(reading, statuses);
  const data = {
    ...reading,
    statuses,
    roomStatuses: attachRoomStatuses(reading, statuses),
    risk: riskScore,
    riskScore,
    riskLevel: worst,
  };

  state.lastMessageAt = new Date().toISOString();
  state.lastReading = data;
  io?.emit('sensor:update', data);
  io?.emit('sensorUpdate', data);
  state.lastEmitAt = Date.now();

  const persist = async () => {
    const anomaly = await checkAnomaly({
      mq2: reading.mq2,
      temperature: reading.temperature,
      humidity: reading.humidity,
      flame: reading.flame,
      rain: reading.drainage,
    }).catch((error) => {
      console.error('ML service error:', error.message);
      return undefined;
    });
    if (anomaly !== undefined) data.anomaly = anomaly;
    data.riskScore = calculateRiskScore(reading, statuses, anomaly);
    data.risk = data.riskScore;
    data.riskLevel = getRiskLevel(data.riskScore).level === 'SAFE' ? worst : (
      ['SAFE', 'WARNING', 'DANGER', 'CRITICAL'].indexOf(getRiskLevel(data.riskScore).level) > ['SAFE', 'WARNING', 'DANGER', 'CRITICAL'].indexOf(worst)
        ? getRiskLevel(data.riskScore).level
        : worst
    );
    await Promise.allSettled([
      writeInflux(data).catch((error) => console.error('History write error:', error.message)),
      pushThingSpeak({
        mq2: reading.mq2,
        temperature: reading.temperature,
        humidity: reading.humidity,
        flame: reading.flame,
        rain: reading.drainage,
      }),
      processAlert(data, prisma, io).catch((error) => console.error('Alert error:', error.message)),
      updateCompliance(data, prisma).catch((error) => console.error('Compliance error:', error.message)),
    ]);
  };

  persist().catch((error) => console.error('Background persist error:', error.message));
  return data;
}

module.exports = { processReading, normalizeReading };
