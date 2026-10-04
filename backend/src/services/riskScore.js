const config = require('../config');
const { rank } = require('./statusEngine');

const FIELD_WEIGHTS = {
  gas: 18,
  smoke: 16,
  temperature: 12,
  humidity: 8,
  flame: 22,
  drainage: 10,
  heatIndex: 8,
  dewPoint: 6,
};

const STATUS_LEVELS = ['SAFE', 'WARNING', 'DANGER', 'CRITICAL'];

// C4: small helper to compare two status levels
function maxLevel(a, b) {
  return STATUS_LEVELS.indexOf(a) >= STATUS_LEVELS.indexOf(b) ? a : b;
}

// C4: one function used for both live emit and Influx to keep them consistent
function computeRisk(reading, statuses = {}, anomaly) {
  if (Number(reading.flame) === 1 || statuses.flame === 'CRITICAL') return 100;

  // C4: derive the worst status level across all fields
  const worst = Object.values(statuses).reduce((max, level) => maxLevel(max, level), 'SAFE');

  // C4: apply a floor so a single DANGER sensor always shows >= 66
  const floors = { WARNING: config.RISK_THRESHOLDS.warning, DANGER: config.RISK_THRESHOLDS.danger, CRITICAL: config.RISK_THRESHOLDS.critical };
  const floor = floors[worst] || 0;

  let score = 0;
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const level = statuses[field] || 'SAFE';
    const factor = rank(level) / 3;
    score += weight * factor;
  }
  if (anomaly?.is_anomaly) score += 12;
  return Math.round(Math.min(100, Math.max(floor, score)));
}

// Legacy alias
function calculateRiskScore(reading, statuses = {}, anomaly) {
  return computeRisk(reading, statuses, anomaly);
}

function getRiskLevel(score) {
  if (score >= config.RISK_THRESHOLDS.critical) return { level: 'CRITICAL', color: '#dc2626', bg: '#fef2f2' };
  if (score >= config.RISK_THRESHOLDS.danger)   return { level: 'DANGER',   color: '#ea580c', bg: '#fff7ed' };
  if (score >= config.RISK_THRESHOLDS.warning)  return { level: 'WARNING',  color: '#d97706', bg: '#fffbeb' };
  return { level: 'SAFE', color: '#059669', bg: '#ecfdf5' };
}

module.exports = { calculateRiskScore, computeRisk, getRiskLevel, maxLevel };
