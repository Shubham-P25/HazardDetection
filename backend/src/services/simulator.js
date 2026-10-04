const config = require('../config');
const { processReading } = require('./readingPipeline');
const { state } = require('../runtimeState');

// C6: scenario: 30 ticks normal, then 8 ticks of one fault, cycling through sensors
const NORMAL_TICKS  = 30;
const FAULT_TICKS   = 8;
const CYCLE_LENGTH  = NORMAL_TICKS + FAULT_TICKS; // 38 ticks
const FAULT_FIELDS  = ['gas', 'smoke', 'temperature', 'humidity', 'flame', 'drainage'];

function jitter(base, spread) {
  return base + (Math.random() - 0.5) * spread;
}

function buildReading(tick) {
  const posInCycle = tick % CYCLE_LENGTH;
  const cycleIndex = Math.floor(tick / CYCLE_LENGTH) % FAULT_FIELDS.length;
  const inFault    = posInCycle >= NORMAL_TICKS; // ticks 30-37 are the fault window
  const faultField = inFault ? FAULT_FIELDS[cycleIndex] : null;

  const reading = {
    mq2:         Math.round(jitter(120, 40)),
    temperature: Number(jitter(28, 3).toFixed(1)),
    humidity:    Number(jitter(45, 8).toFixed(1)),
    flame:       0,
    rain:        0,
    simulated:   true,
  };

  if (faultField === 'gas' || faultField === 'smoke') reading.mq2 = 800;
  if (faultField === 'temperature') reading.temperature = 50;  // above critical 48°C
  if (faultField === 'humidity')    reading.humidity    = 88;  // above dangerHigh 85%
  if (faultField === 'flame')       reading.flame       = 1;
  if (faultField === 'drainage')    reading.rain        = 1;

  return reading;
}

function startSimulator(io, prisma) {
  if (!config.SIMULATOR) return null;
  state.simulator = true;
  console.warn('⚠  SIMULATOR=true: publishing synthetic readings every 2 s. Real MQTT messages are ignored.');
  let tick = 0;

  const send = () => {
    processReading(buildReading(tick), { io, prisma }).catch((error) => {
      console.error('Simulator error:', error.message);
    });
  };

  // Send one reading immediately so the UI fills on first load
  send();
  const timer = setInterval(() => { tick += 1; send(); }, 2000);
  return timer;
}

module.exports = { startSimulator };
