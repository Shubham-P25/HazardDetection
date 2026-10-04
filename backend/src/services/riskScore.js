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

function calculateRiskScore(reading, statuses = {}, anomaly) {
  if (Number(reading.flame) === 1 || statuses.flame === 'CRITICAL') return 100;
  let score = 0;
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const level = statuses[field] || 'SAFE';
    const factor = rank(level) / 3;
    score += weight * factor;
  }
  if (anomaly?.is_anomaly) score += 12;
  return Math.round(Math.min(100, score));
}

function getRiskLevel(score) {
  if (score >= config.RISK_THRESHOLDS.critical) return { level: 'CRITICAL', color: '#dc2626', bg: '#fef2f2' };
  if (score >= config.RISK_THRESHOLDS.danger) return { level: 'DANGER', color: '#ea580c', bg: '#fff7ed' };
  if (score >= config.RISK_THRESHOLDS.warning) return { level: 'WARNING', color: '#d97706', bg: '#fffbeb' };
  return { level: 'SAFE', color: '#059669', bg: '#ecfdf5' };
}

module.exports = { calculateRiskScore, getRiskLevel };
