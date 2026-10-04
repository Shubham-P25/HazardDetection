const config = require('../config');

/**
 * Approximate MQ-2 conversion using the same power-law curves as MQUnifiedsensor.
 * ADC is assumed 10-bit (0-1023) at 5 V with RL from config. Values are uncalibrated
 * until R0 is measured in clean air.
 */
function resistanceFromAdc(adc) {
  const voltage = (Number(adc) / 1023) * config.MQ2_VC;
  if (voltage <= 0.01) return Infinity;
  return ((config.MQ2_VC - voltage) / voltage) * config.MQ2_RL;
}

function ppmFromRatio(ratio, a, b) {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  return a * ratio ** b;
}

function convertMq2(adc) {
  const rs = resistanceFromAdc(adc);
  const ratio = rs / config.MQ2_R0;
  return {
    gas: Math.max(0, Math.round(ppmFromRatio(ratio, 574.25, -2.222))),
    smoke: Math.max(0, Math.round(ppmFromRatio(ratio, 307.95, -2.186))),
    rs,
    ratio,
  };
}

module.exports = { convertMq2, resistanceFromAdc };
