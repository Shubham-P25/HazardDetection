const thresholds = require('../config/thresholds');

const RANK = { NONE: -1, SAFE: 0, WARNING: 1, DANGER: 2, CRITICAL: 3 };
// C7: key by `${deviceId}:${field}` so a second node doesn't corrupt the first
const fieldState = new Map();

function rank(level) {
  return RANK[level] ?? 0;
}

function fromRank(value) {
  return ['SAFE', 'WARNING', 'DANGER', 'CRITICAL'][value] || 'SAFE';
}

function humidityLevel(value) {
  if (value == null || !Number.isFinite(value)) return 'NONE';
  const t = thresholds.fields.humidity;
  if (value >= t.dangerHigh || value <= t.dangerLow)   return 'DANGER';
  if (value >= t.warningHigh || value <= t.warningLow) return 'WARNING';
  return 'SAFE';
}

function numericLevel(value, spec) {
  if (value == null || !Number.isFinite(value)) return 'NONE';
  if (spec.critical != null && value >= spec.critical) return 'CRITICAL';
  if (spec.danger   != null && value >= spec.danger)   return 'DANGER';
  if (spec.warning  != null && value >= spec.warning)  return 'WARNING';
  return 'SAFE';
}

function rawLevel(field, value, extra) {
  // C5: null/non-finite values → NONE status
  if (value == null || !Number.isFinite(Number(value))) return 'NONE';
  const spec = thresholds.fields[field];
  if (field === 'humidity')  return humidityLevel(value);
  if (field === 'flame')     return Number(value) === 1 ? 'CRITICAL' : 'SAFE';
  if (field === 'drainage') {
    if (!Number(value)) return 'SAFE';
    if (extra.drainageWetMs >= thresholds.drainageWetCriticalMs) return 'CRITICAL';
    return 'DANGER';
  }
  return numericLevel(value, spec);
}

function hysteresisHolds(field, value, currentLevel) {
  const spec = thresholds.fields[field];
  const margin = thresholds.hysteresisMargin;
  if (field === 'humidity') {
    const t = spec;
    if (currentLevel === 'DANGER')  return value >= t.dangerHigh * (1 - margin) || value <= t.dangerLow * (1 + margin);
    if (currentLevel === 'WARNING') return value >= t.warningHigh * (1 - margin) || value <= t.warningLow * (1 + margin);
    return false;
  }
  if (field === 'flame' || field === 'drainage') return false;
  const limit = spec[currentLevel.toLowerCase()];
  if (limit == null) return false;
  return value >= limit * (1 - margin);
}

// C7: accepts optional deviceId to namespace the state map
function evaluateField(field, value, extra, deviceId) {
  const mapKey = deviceId ? `${deviceId}:${field}` : field;
  const proposed = rawLevel(field, value, extra);
  const prev = fieldState.get(mapKey) || { level: 'SAFE', pending: 'SAFE', count: 0 };

  if (proposed === 'NONE') {
    // C5: don't raise or lower - just leave current level when sensor is absent
    fieldState.set(mapKey, prev);
    return prev.level;
  }

  if (rank(proposed) > rank(prev.level)) {
    if (proposed === prev.pending) prev.count += 1;
    else { prev.pending = proposed; prev.count = 1; }
    if (prev.count >= thresholds.consecutiveToRaise) {
      prev.level = proposed;
      prev.pending = proposed;
      prev.count = 0;
    }
  } else if (rank(proposed) < rank(prev.level)) {
    if (hysteresisHolds(field, value, prev.level)) {
      prev.pending = prev.level;
      prev.count = 0;
    } else {
      prev.level = proposed;
      prev.pending = proposed;
      prev.count = 0;
    }
  } else {
    prev.pending = proposed;
    prev.count = 0;
    prev.level = proposed;
  }
  fieldState.set(mapKey, prev);
  return prev.level;
}

// C7: accepts optional deviceId
function evaluateStatuses(reading, extra, deviceId) {
  const statuses = {};
  for (const field of Object.keys(thresholds.fields)) {
    statuses[field] = evaluateField(field, reading[field], extra, deviceId);
  }
  const worst = Object.values(statuses).reduce((max, level) => (rank(level) > rank(max) ? level : max), 'SAFE');
  return { statuses, worst };
}

module.exports = { evaluateStatuses, rank, fromRank, fieldState };
