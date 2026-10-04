const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const config = require('./config');

const enabled = Boolean(config.INFLUX_URL && config.INFLUX_TOKEN && config.INFLUX_ORG && config.INFLUX_BUCKET);
const client = enabled ? new InfluxDB({ url: config.INFLUX_URL, token: config.INFLUX_TOKEN }) : null;
const writeApi = client ? client.getWriteApi(config.INFLUX_ORG, config.INFLUX_BUCKET, 'ns') : null;
const queryApi = client ? client.getQueryApi(config.INFLUX_ORG) : null;

let pending = 0;
let flushTimer = null;

function scheduleFlush() {
  if (!writeApi) return;
  if (pending >= 20) {
    pending = 0;
    writeApi.flush().catch((error) => console.error('Influx flush error:', error.message));
    return;
  }
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    pending = 0;
    writeApi.flush().catch((error) => console.error('Influx flush error:', error.message));
  }, 1000);
}

async function writeInflux(data) {
  if (!writeApi) return;
  const point = new Point('sensor_readings')
    .tag('level', data.riskLevel || 'SAFE')
    .tag('zone', data.zone || 'plant')
    .tag('deviceId', data.deviceId || 'node-1')
    .floatField('mq2', data.mq2)
    .floatField('gas', data.gas)
    .floatField('smoke', data.smoke)
    .floatField('temperature', data.temperature)
    .floatField('humidity', data.humidity)
    .intField('flame', data.flame)
    .intField('rain', data.drainage)
    .intField('drainage', data.drainage)
    .floatField('heatIndex', data.heatIndex)
    .floatField('dewPoint', data.dewPoint)
    .intField('risk', data.riskScore || data.risk || 0)
    .intField('risk_score', data.riskScore || data.risk || 0)
    .timestamp(new Date(data.ts || data.timestamp || Date.now()));
  writeApi.writePoint(point);
  pending += 1;
  scheduleFlush();
}

function bucketForRange(from, to) {
  const span = new Date(to).getTime() - new Date(from).getTime();
  if (span <= 2 * 60 * 60 * 1000) return 'raw';
  if (span <= 26 * 60 * 60 * 1000) return '1m';
  if (span <= 8 * 24 * 60 * 60 * 1000) return '15m';
  return '1h';
}

async function queryHistory({ field, from, to, bucket }) {
  if (!queryApi) return [];
  const start = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const stop = to || new Date().toISOString();
  const window = bucket || bucketForRange(start, stop);
  const fieldName = field === 'riskScore' || field === 'risk' ? 'risk' : field;
  const aggregate = window === 'raw'
    ? ''
    : `|> aggregateWindow(every: ${window === '1m' ? '1m' : window === '15m' ? '15m' : '1h'}, fn: mean, createEmpty: false)
  |> duplicate(column: "_value", as: "mean")`;
  const flux = `from(bucket: "${config.INFLUX_BUCKET}")
  |> range(start: time(v: "${start}"), stop: time(v: "${stop}"))
  |> filter(fn: (r) => r._measurement == "sensor_readings")
  |> filter(fn: (r) => r._field == "${fieldName}" or r._field == "${fieldName === 'risk' ? 'risk_score' : fieldName}")
  ${aggregate}`;
  const results = [];
  await queryApi.collectRows(flux, (row, tableMeta) => results.push(tableMeta.toObject(row)));
  return results.map((row) => ({
    timestamp: row._time,
    value: row._value,
    field: fieldName,
  }));
}

async function queryInflux(range = '24h') {
  if (!queryApi) return [];
  const allowed = /^\d+(m|h|d|w)$/;
  const safeRange = allowed.test(range) ? range : '24h';
  const fluxQuery = `from(bucket: "${config.INFLUX_BUCKET}")
  |> range(start: -${safeRange})
  |> filter(fn: (r) => r._measurement == "sensor_readings")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")`;
  const results = [];
  await queryApi.collectRows(fluxQuery, (row, tableMeta) => results.push(tableMeta.toObject(row)));
  return results.map((row) => ({
    ...row,
    timestamp: row.timestamp || row._time,
    riskScore: row.riskScore ?? row.risk_score ?? row.risk,
    drainage: row.drainage ?? row.rain,
  }));
}

async function flushInflux() {
  if (!writeApi) return;
  await writeApi.flush();
}

module.exports = { writeInflux, queryInflux, queryHistory, flushInflux, bucketForRange };
