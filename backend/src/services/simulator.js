const config = require('../config');
const { processReading } = require('./readingPipeline');
const { state } = require('../runtimeState');

const FIELDS = ['gas', 'smoke', 'temperature', 'humidity', 'flame', 'drainage'];

function jitter(base, spread) {
  return base + (Math.random() - 0.5) * spread;
}

function buildReading(tick) {
  const spike = tick % 40 === 39 ? FIELDS[Math.floor(tick / 40) % FIELDS.length] : null;
  const reading = {
    mq2: Math.round(jitter(120, 40)),
    temperature: Number(jitter(28, 3).toFixed(1)),
    humidity: Number(jitter(45, 8).toFixed(1)),
    flame: 0,
    rain: 0,
    simulated: true,
  };
  if (spike === 'gas' || spike === 'smoke') reading.mq2 = 700;
  if (spike === 'temperature') reading.temperature = 44;
  if (spike === 'humidity') reading.humidity = 88;
  if (spike === 'flame') reading.flame = 1;
  if (spike === 'drainage') reading.rain = 1;
  return reading;
}

function startSimulator(io, prisma) {
  if (!config.SIMULATOR) return null;
  state.simulator = true;
  console.log('SIMULATOR=true: publishing synthetic readings every 2s');
  let tick = 0;
  const timer = setInterval(() => {
    tick += 1;
    processReading(buildReading(tick), { io, prisma }).catch((error) => {
      console.error('Simulator error:', error.message);
    });
  }, 2000);
  processReading(buildReading(tick), { io, prisma }).catch((error) => {
    console.error('Simulator error:', error.message);
  });
  return timer;
}

module.exports = { startSimulator };
