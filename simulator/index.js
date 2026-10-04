require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
const intervalMs = Number(process.env.INTERVAL_MS || 2000);
const dataFile = process.env.DATA_FILE;
const apiKey = process.env.INGEST_API_KEY;
if (!dataFile) throw new Error('DATA_FILE is required; synthetic simulator data is disabled');
if (!apiKey) throw new Error('INGEST_API_KEY is required for replay');

function number(value, name) {
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`Invalid ${name} value: ${value}`);
  return result;
}

function normalizeReading(input) {
  const value = (keys) => keys.map((key) => input[key]).find((item) => item !== undefined && item !== null && item !== '');
  return {
    mq2: number(value(['mq2', 'gas', 'gas_raw', 'gas_ppm', 'smoke']), 'mq2'),
    temperature: number(value(['temperature', 'temp', 'temperature_c']), 'temperature'),
    humidity: number(value(['humidity', 'humidity_percent']), 'humidity'),
    flame: number(value(['flame', 'fire']), 'flame'),
    rain: number(value(['rain', 'rain_detected']), 'rain')
  };
}

function loadReadings(file) {
  const content = fs.readFileSync(file, 'utf8').trim();
  if (!content) throw new Error(`Sensor data file is empty: ${file}`);
  if (file.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(content);
    const rows = Array.isArray(parsed) ? parsed : parsed.readings;
    if (!Array.isArray(rows)) throw new Error('JSON must contain an array or a readings array');
    return rows.map(normalizeReading);
  }
  const lines = content.split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(',').map((header) => header.trim());
  return lines.map((line) => normalizeReading(Object.fromEntries(line.split(',').map((item, index) => [headers[index], item.trim()]))));
}

const readings = loadReadings(dataFile);
let index = 0;
async function send() {
  const value = readings[index];
  index = (index + 1) % readings.length;
  try { await axios.post(`${backendUrl}/api/sensors/reading`, value, { headers: { 'x-api-key': apiKey } }); console.log(`[real ${index}/${readings.length}]`, value); }
  catch (error) { console.error('Send error:', error.response?.data || error.message); }
}

console.log(`Real data replay (${readings.length} readings) -> ${backendUrl} every ${intervalMs}ms`);
setInterval(send, intervalMs);
send();
