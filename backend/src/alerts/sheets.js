const path = require('path');
const { google } = require('googleapis');
const config = require('../config');
const { queryInflux } = require('../influx');

let sheetsPromise;

async function getSheets() {
  if (!sheetsPromise) {
    const keyFile = config.GOOGLE_CREDENTIALS_PATH || path.resolve(__dirname, '../../google-credentials.json');
    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });
    sheetsPromise = auth.getClient().then((client) => google.sheets({ version: 'v4', auth: client }));
  }
  return sheetsPromise;
}

async function logToSheets(payload) {
  if (!config.GOOGLE_SHEETS_ID) throw new Error('Google Sheets configuration is incomplete');
  const api = await getSheets();
  await api.spreadsheets.values.append({
    spreadsheetId: config.GOOGLE_SHEETS_ID,
    range: `${config.GOOGLE_SHEETS_TAB}!A:F`,
    valueInputOption: 'RAW',
    resource: { values: [[new Date().toISOString(), payload.type, payload.sensor, payload.value, payload.message, `${payload.riskScore}/100`]] },
  });
}

function chunk(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

async function exportToSheets(body, prisma) {
  const from = body.from ? new Date(body.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const to = body.to ? new Date(body.to) : new Date();
  const maxMs = 30 * 24 * 60 * 60 * 1000;
  let capped = false;
  let start = from;
  if (to.getTime() - from.getTime() > maxMs) {
    start = new Date(to.getTime() - maxMs);
    capped = true;
  }
  const rangeHours = Math.max(1, Math.ceil((to.getTime() - start.getTime()) / 3600000));
  const range = rangeHours <= 24 ? `${rangeHours}h` : `${Math.min(30, Math.ceil(rangeHours / 24))}d`;
  const rows = await queryInflux(range);
  const header = ['timestamp', 'gas', 'smoke', 'temperature', 'humidity', 'flame', 'drainage', 'heatIndex', 'dewPoint', 'risk'];
  const values = [header, ...rows.map((row) => header.map((key) => (key === 'timestamp' ? (row.timestamp || row._time) : row[key] ?? '')))];
  const api = await getSheets();
  const title = `HazardGuard export ${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const created = await api.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [{ properties: { title: 'Sensors' } }, { properties: { title: 'Hazard logs' } }],
    },
  });
  const spreadsheetId = created.data.spreadsheetId;
  const url = created.data.spreadsheetUrl;
  for (const part of chunk(values, 2000)) {
    await api.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sensors!A1',
      valueInputOption: 'RAW',
      resource: { values: part },
    });
  }
  if (prisma) {
    const incidents = await prisma.incident.findMany({
      where: { startedAt: { gte: start, lte: to } },
      include: { alerts: true },
      orderBy: { startedAt: 'desc' },
      take: 2000,
    });
    const hazardHeader = ['Time', 'Zone', 'Sensor', 'Value', 'Unit', 'Severity', 'Status'];
    const hazardRows = [hazardHeader, ...incidents.map((item) => [
      item.startedAt.toISOString(), item.zone, item.sensorField, item.peakValue, item.unit, item.severity, item.status,
    ])];
    await api.spreadsheets.values.append({
      spreadsheetId,
      range: 'Hazard logs!A1',
      valueInputOption: 'RAW',
      resource: { values: hazardRows },
    });
  }
  return { url, spreadsheetId, capped, warning: capped ? 'Export capped at 30 days' : undefined };
}

module.exports = { logToSheets, exportToSheets };
