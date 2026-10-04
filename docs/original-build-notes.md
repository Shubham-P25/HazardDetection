# INDUSTRIAL HAZARD DETECTION SYSTEM — MASTER BUILD FILE
> Single-file instructions for VS Code AI bot. Process one STEP at a time. Each FILE block = one file to create at that exact path. Do not skip steps.

---

## OVERVIEW
**Project:** Industrial-grade IoT Hazard Detection Dashboard  
**Sensors:** MQ-2 (Gas/Smoke), DHT11 (Temp+Humidity), Flame, Rain  
**Theme:** Light — white/slate UI, industrial accent colors  
**Features:** Live dashboard · Risk Score · AI Anomaly Detection · Tiered Alerts · Digital Twin Map · Incident PDF · Historical Analytics · Safety Compliance Log · Telegram + Email + Google Sheets alerts · ThingSpeak integration

---

## FINAL FEATURE LIST
1. Composite Hazard Risk Score (0–100) from all 4 sensors
2. AI Anomaly Detection — Isolation Forest (FastAPI + scikit-learn)
3. Tiered Alert System — WARNING / DANGER / CRITICAL
4. Multi-channel Alerts — Telegram Bot + Email (HTML) + Google Sheets log
5. Digital Twin Factory Floor Map (SVG zones, color-coded live)
6. Automated Incident Report PDF (jsPDF, downloadable)
7. Historical Analytics Dashboard (time-range charts, incident counts)
8. Safety Compliance Log (safe vs unsafe minutes per zone per day)
9. ThingSpeak live feed integration
10. Real-time via Socket.io (no page refresh)

---

## PROJECT STRUCTURE
```
hazard-detection/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config.js
│   │   ├── index.js
│   │   ├── influx.js
│   │   ├── alerts/
│   │   │   ├── email.js
│   │   │   ├── sheets.js
│   │   │   └── telegram.js
│   │   ├── mqtt/
│   │   │   └── mqttClient.js
│   │   ├── routes/
│   │   │   ├── analyticsRoutes.js
│   │   │   ├── incidentRoutes.js
│   │   │   └── sensorRoutes.js
│   │   ├── services/
│   │   │   ├── alertEngine.js
│   │   │   ├── anomalyClient.js
│   │   │   ├── compliance.js
│   │   │   ├── riskScore.js
│   │   │   └── thingspeak.js
│   │   └── socket/
│   │       └── socketHandler.js
│   ├── .env
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── incidents/
│   │   │   └── page.tsx
│   │   └── map/
│   │       └── page.tsx
│   ├── components/
│   │   ├── AlertFeed.tsx
│   │   ├── FloorMap.tsx
│   │   ├── Navbar.tsx
│   │   ├── RiskGauge.tsx
│   │   ├── SensorCard.tsx
│   │   └── SensorChart.tsx
│   ├── hooks/
│   │   └── useSensorData.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── socket.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   ├── .env.local
│   ├── next.config.ts
│   ├── package.json
│   └── tailwind.config.ts
├── ml-service/
│   ├── main.py
│   ├── model.py
│   ├── train.py
│   └── requirements.txt
└── simulator/
    ├── index.js
    ├── sensors.js
    └── package.json
```

---

## STEP 1 — FOUNDATION (Dependencies + Config + Schema)

### FILE: backend/package.json
```json
{
  "name": "hazard-backend",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "@influxdata/influxdb-client": "^1.33.2",
    "@prisma/client": "^5.14.0",
    "axios": "^1.6.8",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "googleapis": "^134.0.0",
    "mqtt": "^5.5.0",
    "node-telegram-bot-api": "^0.64.0",
    "nodemailer": "^6.9.13",
    "socket.io": "^4.7.5"
  },
  "devDependencies": {
    "nodemon": "^3.1.0",
    "prisma": "^5.14.0"
  }
}
```

### FILE: frontend/package.json
```json
{
  "name": "hazard-frontend",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "apexcharts": "^3.49.1",
    "framer-motion": "^11.2.10",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.2",
    "next": "14.2.3",
    "react": "^18.3.1",
    "react-apexcharts": "^1.4.0",
    "react-dom": "^18.3.1",
    "socket.io-client": "^4.7.5",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5"
  }
}
```

### FILE: simulator/package.json
```json
{
  "name": "hazard-simulator",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "axios": "^1.6.8"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

### FILE: ml-service/requirements.txt
```
fastapi==0.111.0
uvicorn==0.30.1
scikit-learn==1.5.0
numpy==1.26.4
pydantic==2.7.1
requests==2.32.3
python-dotenv==1.0.1
```

### FILE: backend/.env
```
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
MQTT_BROKER=mqtt://broker.hivemq.com
ML_SERVICE_URL=http://localhost:8000
INFLUX_URL=https://YOUR_REGION.gcp.influxdata.com
INFLUX_TOKEN=YOUR_INFLUX_TOKEN
INFLUX_ORG=YOUR_INFLUX_ORG
INFLUX_BUCKET=hazard-sensors
THINGSPEAK_WRITE_KEY=YOUR_THINGSPEAK_WRITE_KEY
THINGSPEAK_CHANNEL_ID=YOUR_CHANNEL_ID
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=YOUR_GMAIL_APP_PASSWORD
EMAIL_TO=recipient@email.com
GOOGLE_SHEETS_ID=YOUR_GOOGLE_SHEET_ID
```

### FILE: frontend/.env.local
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### FILE: backend/prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Incident {
  id           String    @id @default(cuid())
  type         String
  sensor       String
  value        Float
  message      String
  acknowledged Boolean   @default(false)
  resolvedAt   DateTime?
  createdAt    DateTime  @default(now())
}

model AlertLog {
  id        String   @id @default(cuid())
  channel   String
  message   String
  success   Boolean
  createdAt DateTime @default(now())
}

model ComplianceRecord {
  id            String   @id @default(cuid())
  date          DateTime
  zone          String
  safeMinutes   Int      @default(0)
  unsafeMinutes Int      @default(0)

  @@unique([date, zone])
}
```

---

## STEP 2 — DATABASE SETUP

### FILE: backend/src/influx.js
```javascript
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const client = new InfluxDB({
  url: process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN,
});

const writeApi = client.getWriteApi(
  process.env.INFLUX_ORG,
  process.env.INFLUX_BUCKET,
  'ns'
);

const queryApi = client.getQueryApi(process.env.INFLUX_ORG);

async function writeInflux(data) {
  const point = new Point('sensor_readings')
    .floatField('mq2', data.mq2)
    .floatField('temperature', data.temperature)
    .floatField('humidity', data.humidity)
    .intField('flame', data.flame)
    .intField('rain', data.rain)
    .intField('risk_score', data.riskScore)
    .tag('level', data.riskLevel)
    .timestamp(new Date());
  writeApi.writePoint(point);
  await writeApi.flush();
}

async function queryInflux(fluxQuery) {
  const results = [];
  await queryApi.collectRows(fluxQuery, (row, tableMeta) => {
    results.push(tableMeta.toObject(row));
  });
  return results;
}

module.exports = { writeInflux, queryInflux };
```

---

## STEP 3 — MOCK DATA SIMULATOR

### FILE: simulator/sensors.js
```javascript
function rand(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

function generateNormal() {
  return { mq2: rand(50, 180), temperature: rand(22, 35), humidity: rand(45, 70), flame: 0, rain: 0 };
}

function generateWarning() {
  return { mq2: rand(200, 390), temperature: rand(38, 46), humidity: rand(20, 35), flame: 0, rain: 0 };
}

function generateCritical() {
  return {
    mq2: rand(500, 900),
    temperature: rand(55, 75),
    humidity: rand(5, 18),
    flame: Math.random() > 0.4 ? 1 : 0,
    rain: Math.random() > 0.6 ? 1 : 0,
  };
}

let gasLevel = 60;
function generateGradualSpike() {
  gasLevel = Math.min(gasLevel + rand(8, 25), 850);
  return { mq2: parseFloat(gasLevel.toFixed(1)), temperature: rand(28, 42), humidity: rand(30, 55), flame: 0, rain: 0 };
}

function resetGas() { gasLevel = 60; }

module.exports = { generateNormal, generateWarning, generateCritical, generateGradualSpike, resetGas };
```

### FILE: simulator/index.js
```javascript
require('dotenv').config();
const axios = require('axios');
const { generateNormal, generateWarning, generateCritical, generateGradualSpike, resetGas } = require('./sensors');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS) || 2000;

// Auto scenario: loops through realistic hazard progression
const SCENARIO = [
  { mode: 'normal',   duration: 15 },
  { mode: 'spike',    duration: 20 },   // gradual gas rise → tests anomaly detection
  { mode: 'warning',  duration: 10 },
  { mode: 'critical', duration: 8  },
  { mode: 'normal',   duration: 12 },
];

let scenarioIdx = 0;
let scenarioCount = 0;
let mode = SCENARIO[0].mode;

function getReading() {
  switch (mode) {
    case 'warning':  return generateWarning();
    case 'critical': return generateCritical();
    case 'spike':    return generateGradualSpike();
    default:         return generateNormal();
  }
}

async function send(reading) {
  try {
    await axios.post(`${BACKEND_URL}/api/sensors/reading`, reading);
    console.log(`[${mode.toUpperCase()}] MQ2:${reading.mq2}ppm T:${reading.temperature}°C H:${reading.humidity}% F:${reading.flame} R:${reading.rain}`);
  } catch (e) {
    console.error('Send error:', e.message);
  }
}

setInterval(async () => {
  await send(getReading());
  scenarioCount++;
  if (scenarioCount >= SCENARIO[scenarioIdx].duration) {
    scenarioIdx = (scenarioIdx + 1) % SCENARIO.length;
    scenarioCount = 0;
    mode = SCENARIO[scenarioIdx].mode;
    if (mode === 'normal') resetGas();
    console.log(`\n--- SCENARIO → ${mode.toUpperCase()} ---\n`);
  }
}, INTERVAL_MS);

console.log(`Simulator → ${BACKEND_URL} | Interval: ${INTERVAL_MS}ms`);
```

---

## STEP 4 — BACKEND SERVER

### FILE: backend/src/config.js
```javascript
module.exports = {
  PORT:                  process.env.PORT || 4000,
  MQTT_BROKER:           process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com',
  MQTT_TOPIC:            'hazard/sensors',
  ML_SERVICE_URL:        process.env.ML_SERVICE_URL || 'http://localhost:8000',
  THINGSPEAK_WRITE_KEY:  process.env.THINGSPEAK_WRITE_KEY,
  THINGSPEAK_CHANNEL_ID: process.env.THINGSPEAK_CHANNEL_ID,
  INFLUX_URL:            process.env.INFLUX_URL,
  INFLUX_TOKEN:          process.env.INFLUX_TOKEN,
  INFLUX_ORG:            process.env.INFLUX_ORG,
  INFLUX_BUCKET:         process.env.INFLUX_BUCKET || 'hazard-sensors',
  TELEGRAM_BOT_TOKEN:    process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID:      process.env.TELEGRAM_CHAT_ID,
  EMAIL_USER:            process.env.EMAIL_USER,
  EMAIL_PASS:            process.env.EMAIL_PASS,
  EMAIL_TO:              process.env.EMAIL_TO,
  GOOGLE_SHEETS_ID:      process.env.GOOGLE_SHEETS_ID,
};
```

### FILE: backend/src/index.js
```javascript
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const { PrismaClient } = require('@prisma/client');
const config     = require('./config');

const { setupMQTT }    = require('./mqtt/mqttClient');
const { setupSocket }  = require('./socket/socketHandler');
const sensorRoutes     = require('./routes/sensorRoutes');
const incidentRoutes   = require('./routes/incidentRoutes');
const analyticsRoutes  = require('./routes/analyticsRoutes');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use((req, _res, next) => { req.io = io; req.prisma = prisma; next(); });

app.use('/api/sensors',   sensorRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

setupSocket(io, prisma);
setupMQTT(io, prisma);

server.listen(config.PORT, () => console.log(`Backend on :${config.PORT}`));
```

### FILE: backend/src/socket/socketHandler.js
```javascript
function setupSocket(io, prisma) {
  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);
    // Replay last 20 incidents so new tab has data immediately
    const incidents = await prisma.incident.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
    incidents.reverse().forEach(i => socket.emit('alert', i));
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
  });
}
module.exports = { setupSocket };
```

### FILE: backend/src/mqtt/mqttClient.js
```javascript
const mqtt   = require('mqtt');
const config = require('../config');
const { calculateRiskScore, getRiskLevel } = require('../services/riskScore');
const { processAlert }  = require('../services/alertEngine');
const { checkAnomaly }  = require('../services/anomalyClient');
const { writeInflux }   = require('../influx');
const { pushThingSpeak } = require('../services/thingspeak');

function setupMQTT(io, prisma) {
  const client = mqtt.connect(config.MQTT_BROKER);
  client.on('connect', () => { console.log('MQTT connected'); client.subscribe(config.MQTT_TOPIC); });
  client.on('message', async (_topic, message) => {
    try {
      const { mq2, temperature, humidity, flame, rain } = JSON.parse(message.toString());
      const riskScore = calculateRiskScore({ mq2, temperature, humidity, flame, rain });
      const { level: riskLevel } = getRiskLevel(riskScore);
      const anomaly = await checkAnomaly({ mq2, temperature, humidity, flame, rain });
      const data = { mq2, temperature, humidity, flame, rain, riskScore, riskLevel, anomaly, timestamp: new Date().toISOString() };
      io.emit('sensorUpdate', data);
      await writeInflux(data);
      pushThingSpeak({ mq2, temperature, humidity, flame, rain });
      await processAlert(data, riskScore, anomaly, io, prisma);
    } catch (e) { console.error('MQTT msg error:', e.message); }
  });
  client.on('error', e => console.error('MQTT error:', e.message));
}
module.exports = { setupMQTT };
```

### FILE: backend/src/services/riskScore.js
```javascript
function calculateRiskScore({ mq2, temperature, humidity, flame, rain }) {
  if (flame === 1) return 95; // instant override
  const gasScore  = Math.min(mq2 / 1000, 1);
  const tempScore = Math.min(Math.max((temperature - 30) / 50, 0), 1);
  const humScore  = humidity < 25 ? (25 - humidity) / 25 : 0;
  const rainScore = rain ? 0.2 : 0;
  const raw = gasScore * 35 + tempScore * 25 + humScore * 10 + rainScore * 5;
  return Math.round(Math.min(raw * 100, 99));
}

function getRiskLevel(score) {
  if (score >= 86) return { level: 'CRITICAL', color: '#ef4444', bg: '#fef2f2' };
  if (score >= 66) return { level: 'DANGER',   color: '#f97316', bg: '#fff7ed' };
  if (score >= 41) return { level: 'WARNING',  color: '#f59e0b', bg: '#fffbeb' };
  return               { level: 'SAFE',     color: '#10b981', bg: '#f0fdf4' };
}

module.exports = { calculateRiskScore, getRiskLevel };
```

### FILE: backend/src/services/alertEngine.js
```javascript
const lastAlertTime = {};
const COOLDOWN_MS = 60000; // 1 min cooldown per sensor+level combo

async function processAlert(sensorData, riskScore, anomaly, io, prisma) {
  const { mq2, temperature, flame } = sensorData;
  let alertType = null;

  if (riskScore >= 86 || flame === 1)           alertType = 'CRITICAL';
  else if (riskScore >= 66)                      alertType = 'DANGER';
  else if (riskScore >= 41 || anomaly?.is_anomaly) alertType = 'WARNING';

  if (!alertType) return;

  let sensor, value, unit, message;
  if (flame === 1)    { sensor = 'Flame Sensor';   value = 1;           unit = '';    message = 'FIRE DETECTED — evacuate immediately!'; }
  else if (mq2 > 300) { sensor = 'MQ-2 Gas';       value = mq2;         unit = 'ppm'; message = `Gas level critical: ${mq2} ppm`; }
  else if (temperature > 45) { sensor = 'DHT11 Temp'; value = temperature; unit = '°C'; message = `Temperature critical: ${temperature}°C`; }
  else if (anomaly?.is_anomaly) { sensor = 'AI Anomaly'; value = riskScore; unit = ''; message = anomaly.message; }
  else               { sensor = 'Combined';        value = riskScore;   unit = 'risk'; message = `Risk score: ${riskScore}/100`; }

  const key = `${sensor}-${alertType}`;
  const now = Date.now();
  if (lastAlertTime[key] && now - lastAlertTime[key] < COOLDOWN_MS) return;
  lastAlertTime[key] = now;

  const incident = await prisma.incident.create({
    data: { type: alertType, sensor, value, message }
  });

  io.emit('alert', { ...incident, riskScore });

  const payload = { type: alertType, sensor, value, unit, message, riskScore, id: incident.id };

  const { sendTelegramAlert } = require('../alerts/telegram');
  const { sendEmailAlert }    = require('../alerts/email');
  const { logToSheets }       = require('../alerts/sheets');
  const { updateCompliance }  = require('./compliance');

  await Promise.allSettled([
    sendTelegramAlert(payload),
    alertType !== 'WARNING' ? sendEmailAlert(payload) : Promise.resolve(),
    alertType === 'CRITICAL' ? logToSheets(payload) : Promise.resolve(),
    updateCompliance(sensorData.riskLevel, prisma),
  ]);
}

module.exports = { processAlert };
```

### FILE: backend/src/services/anomalyClient.js
```javascript
const axios  = require('axios');
const config = require('../config');

async function checkAnomaly(readings) {
  try {
    const res = await axios.post(`${config.ML_SERVICE_URL}/predict`, readings, { timeout: 2000 });
    return res.data;
  } catch { return null; } // ML offline = no crash
}

module.exports = { checkAnomaly };
```

### FILE: backend/src/services/thingspeak.js
```javascript
const axios  = require('axios');
const config = require('../config');

async function pushThingSpeak({ mq2, temperature, humidity, flame, rain }) {
  if (!config.THINGSPEAK_WRITE_KEY) return;
  try {
    await axios.get('https://api.thingspeak.com/update', {
      params: { api_key: config.THINGSPEAK_WRITE_KEY, field1: mq2, field2: temperature, field3: humidity, field4: flame, field5: rain }
    });
  } catch (e) { console.error('ThingSpeak error:', e.message); }
}

module.exports = { pushThingSpeak };
```

### FILE: backend/src/services/compliance.js
```javascript
async function updateCompliance(riskLevel, prisma) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const zone   = 'Zone A';
  const isSafe = riskLevel === 'SAFE';
  await prisma.complianceRecord.upsert({
    where:  { date_zone: { date: today, zone } },
    update: { safeMinutes: isSafe ? { increment: 1 } : undefined, unsafeMinutes: !isSafe ? { increment: 1 } : undefined },
    create: { date: today, zone, safeMinutes: isSafe ? 1 : 0, unsafeMinutes: !isSafe ? 1 : 0 },
  });
}
module.exports = { updateCompliance };
```

---

## STEP 5 — ALERT ENGINE (Telegram + Email + Sheets)

### FILE: backend/src/alerts/telegram.js
```javascript
const TelegramBot = require('node-telegram-bot-api');
const config      = require('../config');

let bot;
function initBot() {
  if (!config.TELEGRAM_BOT_TOKEN) return;
  bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN);
}

async function sendTelegramAlert({ type, sensor, value, unit, message, riskScore }) {
  if (!bot) initBot();
  if (!bot || !config.TELEGRAM_CHAT_ID) return;
  const icons = { WARNING: '⚠️', DANGER: '🔥', CRITICAL: '🚨' };
  const icon  = icons[type] || '⚠️';
  const text  = `${icon} *${type} ALERT*\n\n🏭 *HazardGuard System*\n\n📍 Sensor: \`${sensor}\`\n📊 Value: \`${value} ${unit}\`\n⚡ Risk: \`${riskScore}/100\`\n📝 ${message}\n🕐 ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
  try { await bot.sendMessage(config.TELEGRAM_CHAT_ID, text, { parse_mode: 'Markdown' }); }
  catch (e) { console.error('Telegram error:', e.message); }
}

module.exports = { sendTelegramAlert };
```

### FILE: backend/src/alerts/email.js
```javascript
const nodemailer = require('nodemailer');
const config     = require('../config');

let transporter;
function init() {
  transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: config.EMAIL_USER, pass: config.EMAIL_PASS } });
}

async function sendEmailAlert({ type, sensor, value, unit, message, riskScore }) {
  if (!transporter) init();
  if (!config.EMAIL_USER || !config.EMAIL_TO) return;
  const COLORS = { WARNING: '#f59e0b', DANGER: '#f97316', CRITICAL: '#ef4444' };
  const ICONS  = { WARNING: '⚠️', DANGER: '🔥', CRITICAL: '🚨' };
  const color  = COLORS[type] || '#f59e0b';
  const icon   = ICONS[type] || '⚠️';
  const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:${color};color:white;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">${icon} ${type} ALERT — HazardGuard</h1>
  </div>
  <div style="background:white;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px;color:#64748b;width:40%">Sensor</td><td style="padding:8px;font-weight:bold">${sensor}</td></tr>
      <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Reading</td><td style="padding:8px;font-weight:bold">${value} ${unit}</td></tr>
      <tr><td style="padding:8px;color:#64748b">Risk Score</td><td style="padding:8px;font-weight:bold;color:${color}">${riskScore}/100</td></tr>
      <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Message</td><td style="padding:8px">${message}</td></tr>
      <tr><td style="padding:8px;color:#64748b">Time</td><td style="padding:8px">${new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</td></tr>
    </table>
    <div style="margin-top:16px;padding:12px;background:#fff7ed;border-left:4px solid ${color};border-radius:4px">
      <strong>Action Required:</strong> Check sensors and ensure safety measures are in place.
    </div>
  </div>
</div>`;
  try {
    await transporter.sendMail({ from: `"HazardGuard" <${config.EMAIL_USER}>`, to: config.EMAIL_TO, subject: `${icon} [${type}] Hazard Alert — ${sensor}`, html });
  } catch (e) { console.error('Email error:', e.message); }
}

module.exports = { sendEmailAlert };
```

### FILE: backend/src/alerts/sheets.js
```javascript
const { google } = require('googleapis');
const config     = require('../config');

let sheets;

async function initSheets() {
  if (!config.GOOGLE_SHEETS_ID) return;
  try {
    const auth = new google.auth.GoogleAuth({ keyFile: './google-credentials.json', scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const client = await auth.getClient();
    sheets = google.sheets({ version: 'v4', auth: client });
    console.log('Google Sheets ready');
  } catch (e) { console.error('Sheets init failed:', e.message); }
}
initSheets();

async function logToSheets({ type, sensor, value, unit, message, riskScore }) {
  if (!sheets || !config.GOOGLE_SHEETS_ID) return;
  const row = [new Date().toISOString(), type, sensor, `${value} ${unit}`, message, `${riskScore}/100`];
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.GOOGLE_SHEETS_ID,
      range: 'Sheet1!A:F',
      valueInputOption: 'RAW',
      resource: { values: [row] },
    });
  } catch (e) { console.error('Sheets log error:', e.message); }
}

module.exports = { logToSheets };
```

### FILE: backend/src/routes/sensorRoutes.js
```javascript
const express = require('express');
const router  = express.Router();
const { calculateRiskScore, getRiskLevel } = require('../services/riskScore');
const { processAlert }    = require('../services/alertEngine');
const { checkAnomaly }    = require('../services/anomalyClient');
const { writeInflux }     = require('../influx');
const { pushThingSpeak }  = require('../services/thingspeak');
const { updateCompliance } = require('../services/compliance');

router.post('/reading', async (req, res) => {
  const { mq2, temperature, humidity, flame, rain } = req.body;
  const riskScore = calculateRiskScore({ mq2, temperature, humidity, flame, rain });
  const { level: riskLevel } = getRiskLevel(riskScore);
  const anomaly = await checkAnomaly({ mq2, temperature, humidity, flame, rain });
  const data = { mq2, temperature, humidity, flame, rain, riskScore, riskLevel, anomaly, timestamp: new Date().toISOString() };

  req.io.emit('sensorUpdate', data);
  await writeInflux(data).catch(e => console.error('InfluxDB write error:', e.message));
  pushThingSpeak({ mq2, temperature, humidity, flame, rain });
  await processAlert(data, riskScore, anomaly, req.io, req.prisma);
  await updateCompliance(riskLevel, req.prisma);

  res.json({ success: true, riskScore, riskLevel });
});

router.get('/latest', async (req, res) => {
  const { queryInflux } = require('../influx');
  try {
    const data = await queryInflux(`from(bucket:"${process.env.INFLUX_BUCKET}")|>range(start:-2m)|>filter(fn:(r)=>r._measurement=="sensor_readings")|>last()`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
```

### FILE: backend/src/routes/incidentRoutes.js
```javascript
const express = require('express');
const router  = express.Router();

router.get('/', async (req, res) => {
  const incidents = await req.prisma.incident.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(incidents);
});

router.patch('/:id/acknowledge', async (req, res) => {
  const incident = await req.prisma.incident.update({ where: { id: req.params.id }, data: { acknowledged: true } });
  res.json(incident);
});

module.exports = router;
```

### FILE: backend/src/routes/analyticsRoutes.js
```javascript
const express = require('express');
const router  = express.Router();

router.get('/history', async (req, res) => {
  const { range = '24h' } = req.query;
  const { queryInflux } = require('../influx');
  const map = { '1h': '-1h', '6h': '-6h', '24h': '-24h', '7d': '-7d' };
  const start = map[range] || '-24h';
  try {
    const data = await queryInflux(
      `from(bucket:"${process.env.INFLUX_BUCKET}")|>range(start:${start})|>filter(fn:(r)=>r._measurement=="sensor_readings")|>aggregateWindow(every:1m,fn:mean,createEmpty:false)`
    );
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/compliance', async (req, res) => {
  const records = await req.prisma.complianceRecord.findMany({ orderBy: { date: 'desc' }, take: 30 });
  const result  = records.map(r => ({
    ...r,
    safePercentage: Math.round((r.safeMinutes / Math.max(r.safeMinutes + r.unsafeMinutes, 1)) * 100),
  }));
  res.json(result);
});

module.exports = router;
```

---

## STEP 6 — ML ANOMALY DETECTION SERVICE

### FILE: ml-service/model.py
```python
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import numpy as np
import pickle, os

class HazardAnomalyDetector:
    def __init__(self):
        self.model      = IsolationForest(contamination=0.05, n_estimators=100, random_state=42)
        self.scaler     = StandardScaler()
        self.is_trained = False

    def train(self, readings):
        X = np.array(readings)
        Xs = self.scaler.fit_transform(X)
        self.model.fit(Xs)
        self.is_trained = True
        with open("model.pkl", "wb") as f:
            pickle.dump({"model": self.model, "scaler": self.scaler}, f)

    def load(self):
        if os.path.exists("model.pkl"):
            with open("model.pkl", "rb") as f:
                d = pickle.load(f)
                self.model, self.scaler, self.is_trained = d["model"], d["scaler"], True

    def predict(self, reading):
        if not self.is_trained:
            return {"is_anomaly": False, "anomaly_score": 0.0, "severity": "UNKNOWN", "message": "Model not trained yet"}
        X  = np.array([reading])
        Xs = self.scaler.transform(X)
        pred  = self.model.predict(Xs)[0]
        score = float(self.model.score_samples(Xs)[0])
        is_anomaly = pred == -1
        if is_anomaly:
            severity = "HIGH" if score < -0.6 else "MEDIUM" if score < -0.4 else "LOW"
        else:
            severity = "NONE"
        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(score, 4),
            "severity": severity,
            "message": f"Anomaly detected ({severity} severity) — potential hazard forming" if is_anomaly else "Readings within normal range",
        }
```

### FILE: ml-service/main.py
```python
from fastapi import FastAPI
from pydantic import BaseModel
from model import HazardAnomalyDetector
import uvicorn

app      = FastAPI(title="HazardGuard ML Service")
detector = HazardAnomalyDetector()
detector.load()  # Load saved model on startup if it exists

class SensorReading(BaseModel):
    mq2: float
    temperature: float
    humidity: float
    flame: int
    rain: int

class TrainingData(BaseModel):
    readings: list[list[float]]

@app.post("/train")
def train(data: TrainingData):
    detector.train(data.readings)
    return {"status": "trained", "samples": len(data.readings)}

@app.post("/predict")
def predict(reading: SensorReading):
    return detector.predict([reading.mq2, reading.temperature, reading.humidity, reading.flame, reading.rain])

@app.get("/health")
def health():
    return {"status": "ok", "model_trained": detector.is_trained}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### FILE: ml-service/train.py
```python
# Run this ONCE after starting ml-service to train the model on normal data
import requests, random, time

def generate_normal(n=500):
    return [
        [random.uniform(50, 200), random.uniform(22, 35), random.uniform(45, 70), 0, 0]
        for _ in range(n)
    ]

if __name__ == "__main__":
    print("Training model with 500 normal readings...")
    res = requests.post("http://localhost:8000/train", json={"readings": generate_normal()})
    print("Result:", res.json())
```

---

## STEP 7 — FRONTEND DASHBOARD

### FILE: frontend/tailwind.config.ts
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        safe:     '#10b981',
        warning:  '#f59e0b',
        danger:   '#f97316',
        critical: '#ef4444',
      },
    },
  },
  plugins: [],
};
export default config;
```

### FILE: frontend/next.config.ts
```typescript
import type { NextConfig } from 'next';
const nextConfig: NextConfig = { reactStrictMode: true };
export default nextConfig;
```

### FILE: frontend/app/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { font-family: 'Inter', system-ui, sans-serif; background: #f8fafc; color: #0f172a; }

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: #f1f5f9; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
```

### FILE: frontend/types/index.ts
```typescript
export interface SensorReading {
  mq2:         number;
  temperature: number;
  humidity:    number;
  flame:       number;
  rain:        number;
  riskScore:   number;
  riskLevel:   'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL';
  anomaly?: {
    is_anomaly:    boolean;
    severity:      string;
    message:       string;
    anomaly_score: number;
  };
  timestamp: string;
}

export interface Incident {
  id:           string;
  type:         'WARNING' | 'DANGER' | 'CRITICAL';
  sensor:       string;
  value:        number;
  message:      string;
  acknowledged: boolean;
  createdAt:    string;
}

export interface AlertItem extends Incident {
  riskScore: number;
}

export interface ComplianceRecord {
  id:             string;
  date:           string;
  zone:           string;
  safeMinutes:    number;
  unsafeMinutes:  number;
  safePercentage: number;
}
```

### FILE: frontend/lib/socket.ts
```typescript
import { io } from 'socket.io-client';
const URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
export const socket = io(URL, { autoConnect: true, reconnection: true, reconnectionDelay: 1000 });
```

### FILE: frontend/lib/api.ts
```typescript
const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export const fetchIncidents   = () => fetch(`${BASE}/api/incidents`).then(r => r.json());
export const fetchHistory     = (range = '24h') => fetch(`${BASE}/api/analytics/history?range=${range}`).then(r => r.json());
export const fetchCompliance  = () => fetch(`${BASE}/api/analytics/compliance`).then(r => r.json());
export const acknowledgeAlert = (id: string) => fetch(`${BASE}/api/incidents/${id}/acknowledge`, { method: 'PATCH' }).then(r => r.json());
```

### FILE: frontend/lib/utils.ts
```typescript
export const fmt     = (...c: (string|undefined|null|false)[]) => c.filter(Boolean).join(' ');
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN');
export const fmtFull = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
```

### FILE: frontend/hooks/useSensorData.ts
```typescript
'use client';
import { useState, useEffect } from 'react';
import { socket }               from '@/lib/socket';
import type { SensorReading, AlertItem } from '@/types';

export function useSensorData() {
  const [current,   setCurrent]   = useState<SensorReading | null>(null);
  const [history,   setHistory]   = useState<SensorReading[]>([]);
  const [alerts,    setAlerts]    = useState<AlertItem[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.on('connect',      ()  => setConnected(true));
    socket.on('disconnect',   ()  => setConnected(false));
    socket.on('sensorUpdate', (d: SensorReading) => {
      setCurrent(d);
      setHistory(p => [...p.slice(-59), d]);
    });
    socket.on('alert', (a: AlertItem) => setAlerts(p => [a, ...p].slice(0, 50)));
    return () => { socket.off('connect'); socket.off('disconnect'); socket.off('sensorUpdate'); socket.off('alert'); };
  }, []);

  return { current, history, alerts, connected };
}
```

### FILE: frontend/app/layout.tsx
```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'HazardGuard — Industrial Safety System',
  description: 'Real-time industrial hazard detection dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
```

### FILE: frontend/components/Navbar.tsx
```tsx
'use client';
import Link        from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',          label: 'Dashboard', icon: '📊' },
  { href: '/analytics', label: 'Analytics', icon: '📈' },
  { href: '/map',       label: 'Zone Map',  icon: '🗺️' },
  { href: '/incidents', label: 'Incidents', icon: '📋' },
];

export function Navbar() {
  const path = usePathname();
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏭</span>
          <div>
            <p className="font-extrabold text-slate-900 leading-none tracking-tight">HazardGuard</p>
            <p className="text-xs text-slate-400">Industrial Safety System</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${path === n.href ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <span>{n.icon}</span>
              <span className="hidden sm:block">{n.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
```

### FILE: frontend/components/SensorCard.tsx
```tsx
'use client';
import { motion } from 'framer-motion';

interface Props {
  label:      string;
  sensor:     string;
  value?:     number;
  unit:       string;
  thresholds: { warning?: number; danger?: number; critical?: number };
  icon:       string;
  invert?:    boolean;
  binary?:    boolean;
}

function status(v: number, t: Props['thresholds'], invert?: boolean, binary?: boolean) {
  if (binary) return v === 1 ? 'CRITICAL' : 'SAFE';
  if (invert) {
    if (t.critical !== undefined && v <= t.critical) return 'CRITICAL';
    if (t.danger   !== undefined && v <= t.danger)   return 'DANGER';
    if (t.warning  !== undefined && v <= t.warning)  return 'WARNING';
  } else {
    if (t.critical !== undefined && v >= t.critical) return 'CRITICAL';
    if (t.danger   !== undefined && v >= t.danger)   return 'DANGER';
    if (t.warning  !== undefined && v >= t.warning)  return 'WARNING';
  }
  return 'SAFE';
}

const CFG = {
  SAFE:     { ring: 'border-emerald-200 bg-emerald-50/40', dot: 'bg-emerald-500',            badge: 'bg-emerald-100 text-emerald-700' },
  WARNING:  { ring: 'border-amber-200  bg-amber-50/40',   dot: 'bg-amber-500  animate-pulse', badge: 'bg-amber-100  text-amber-700'  },
  DANGER:   { ring: 'border-orange-200 bg-orange-50/40',  dot: 'bg-orange-500 animate-pulse', badge: 'bg-orange-100 text-orange-700' },
  CRITICAL: { ring: 'border-red-300    bg-red-50/50',     dot: 'bg-red-500    animate-ping',  badge: 'bg-red-100    text-red-700'   },
};

export function SensorCard({ label, sensor, value, unit, thresholds, icon, invert, binary }: Props) {
  const s   = value !== undefined ? status(value, thresholds, invert, binary) : 'SAFE';
  const cfg = CFG[s];
  const display = binary ? (value === 1 ? 'DETECTED' : 'CLEAR') : (value?.toFixed(1) ?? '—');

  return (
    <motion.div layout className={`rounded-xl border-2 ${cfg.ring} p-5 transition-all duration-500 bg-white shadow-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-xs text-slate-300 mt-0.5">{sensor}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1.5 ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {s}
        </span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-4xl font-black text-slate-900 leading-none">{display}</span>
        {!binary && <span className="text-sm text-slate-400 mb-1">{unit}</span>}
      </div>
      <div className="mt-4 text-3xl">{icon}</div>
    </motion.div>
  );
}
```

### FILE: frontend/components/RiskGauge.tsx
```tsx
'use client';
import dynamic      from 'next/dynamic';
import { motion }   from 'framer-motion';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const LEVEL_CFG = {
  SAFE:     { color: '#10b981', label: '✅ Safe Zone',   bg: 'text-emerald-600' },
  WARNING:  { color: '#f59e0b', label: '⚠️ Warning',    bg: 'text-amber-600'  },
  DANGER:   { color: '#f97316', label: '🔥 Danger',     bg: 'text-orange-600' },
  CRITICAL: { color: '#ef4444', label: '🚨 Critical',   bg: 'text-red-600'    },
};

export function RiskGauge({ score, level }: { score: number; level: string }) {
  const cfg = LEVEL_CFG[level as keyof typeof LEVEL_CFG] ?? LEVEL_CFG.SAFE;

  const options = {
    chart: { type: 'radialBar' as const, background: 'transparent' },
    plotOptions: {
      radialBar: {
        startAngle: -135, endAngle: 135,
        hollow:     { size: '65%' },
        track:      { background: '#f1f5f9', strokeWidth: '100%' },
        dataLabels: {
          name:  { show: true, offsetY: -10, fontSize: '12px', color: '#94a3b8' },
          value: { show: true, fontSize: '40px', fontWeight: 800, color: '#0f172a', formatter: (v: number) => Math.round(v).toString() }
        },
      },
    },
    fill:   { colors: [cfg.color] },
    labels: ['Risk Score'],
    stroke: { lineCap: 'round' as const },
  };

  return (
    <div className="flex flex-col items-center">
      <Chart options={options} series={[score]} type="radialBar" width={250} height={250} />
      <motion.p key={level} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className={`text-lg font-bold ${cfg.bg}`}>
        {cfg.label}
      </motion.p>
    </div>
  );
}
```

### FILE: frontend/components/AlertFeed.tsx
```tsx
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { AlertItem }          from '@/types';
import { fmtTime }                 from '@/lib/utils';

const CFG = {
  WARNING:  { bar: 'border-l-amber-500',  bg: 'bg-amber-50',  icon: '⚠️', text: 'text-amber-800'  },
  DANGER:   { bar: 'border-l-orange-500', bg: 'bg-orange-50', icon: '🔥', text: 'text-orange-800' },
  CRITICAL: { bar: 'border-l-red-500',    bg: 'bg-red-50',    icon: '🚨', text: 'text-red-800'    },
};

export function AlertFeed({ alerts }: { alerts: AlertItem[] }) {
  if (!alerts.length) return (
    <div className="flex flex-col items-center justify-center h-44 text-slate-300">
      <span className="text-4xl mb-2">✅</span>
      <p className="text-sm">No alerts — all systems nominal</p>
    </div>
  );

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      <AnimatePresence initial={false}>
        {alerts.map(a => {
          const cfg = CFG[a.type] ?? CFG.WARNING;
          return (
            <motion.div key={a.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className={`${cfg.bg} border border-transparent border-l-4 ${cfg.bar} rounded-lg px-4 py-3`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{cfg.icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${cfg.text}`}>{a.type} — {a.sensor}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{a.message}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">{fmtTime(a.createdAt)}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Risk {a.riskScore}/100</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
```

### FILE: frontend/components/SensorChart.tsx
```tsx
'use client';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface Props {
  title:      string;
  data:       { x: string; y: number }[];
  color:      string;
  unit:       string;
  dangerLine?: number;
}

export function SensorChart({ title, data, color, unit, dangerLine }: Props) {
  const annotations: any = dangerLine ? {
    yaxis: [{ y: dangerLine, borderColor: '#ef4444', strokeDashArray: 5,
      label: { text: `⚠ ${dangerLine}${unit}`, style: { color: '#fff', background: '#ef4444', fontSize: '10px' } } }]
  } : {};

  const options = {
    chart:    { type: 'area' as const, background: 'transparent', toolbar: { show: false }, animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 600 } } },
    stroke:   { curve: 'smooth' as const, width: 2 },
    fill:     { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02 } },
    colors:   [color],
    xaxis:    { type: 'datetime' as const, labels: { style: { colors: '#94a3b8', fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis:    { labels: { style: { colors: '#94a3b8', fontSize: '10px' }, formatter: (v: number) => `${v.toFixed(0)}${unit}` } },
    grid:     { borderColor: '#f1f5f9', strokeDashArray: 3 },
    tooltip:  { x: { format: 'HH:mm:ss' }, y: { formatter: (v: number) => `${v.toFixed(2)} ${unit}` } },
    dataLabels: { enabled: false },
    annotations,
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      <Chart options={options}
        series={[{ name: title, data: data.map(d => ({ x: new Date(d.x).getTime(), y: d.y })) }]}
        type="area" height={180} />
    </div>
  );
}
```

### FILE: frontend/components/FloorMap.tsx
```tsx
'use client';
import { motion } from 'framer-motion';
import type { SensorReading } from '@/types';

const ZONES = [
  { id: 'Z-A', name: 'Storage',    sensor: 'mq2' as keyof SensorReading,         x: 60,  y: 55,  w: 170, h: 115, thresholds: { w: 200, c: 400 } },
  { id: 'Z-B', name: 'Assembly',   sensor: 'temperature' as keyof SensorReading,  x: 270, y: 55,  w: 170, h: 115, thresholds: { w: 38,  c: 50  } },
  { id: 'Z-C', name: 'Generator',  sensor: 'flame' as keyof SensorReading,        x: 60,  y: 210, w: 170, h: 115, thresholds: { c: 1   } },
  { id: 'Z-D', name: 'Electrical', sensor: 'rain' as keyof SensorReading,         x: 270, y: 210, w: 170, h: 115, thresholds: { w: 1   } },
];

function getStatus(zone: typeof ZONES[0], data: SensorReading | null) {
  if (!data) return 'SAFE';
  const v = data[zone.sensor] as number;
  if (zone.thresholds.c !== undefined && v >= zone.thresholds.c) return 'CRITICAL';
  if (zone.thresholds.w !== undefined && v >= zone.thresholds.w) return 'WARNING';
  return 'SAFE';
}

const C = {
  SAFE:     { fill: '#dcfce7', stroke: '#16a34a', text: '#15803d' },
  WARNING:  { fill: '#fef9c3', stroke: '#ca8a04', text: '#92400e' },
  DANGER:   { fill: '#ffedd5', stroke: '#ea580c', text: '#c2410c' },
  CRITICAL: { fill: '#fee2e2', stroke: '#dc2626', text: '#991b1b' },
};

const sensorLabel = (zone: typeof ZONES[0], data: SensorReading | null) => {
  if (!data) return '—';
  const v = data[zone.sensor];
  if (zone.sensor === 'mq2')         return `${(v as number).toFixed(0)} ppm`;
  if (zone.sensor === 'temperature') return `${(v as number).toFixed(1)}°C`;
  if (zone.sensor === 'flame')       return v ? '🔥 FIRE' : '✅ Clear';
  if (zone.sensor === 'rain')        return v ? '💧 Wet' : '✅ Dry';
  return '—';
};

export function FloorMap({ data }: { data: SensorReading | null }) {
  return (
    <svg viewBox="0 0 500 360" className="w-full max-w-2xl mx-auto">
      <rect x="40" y="35" width="420" height="300" rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
      <text x="250" y="25" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">FACTORY FLOOR — ZONE OVERVIEW</text>
      {ZONES.map(zone => {
        const s = getStatus(zone, data);
        const c = C[s] ?? C.SAFE;
        return (
          <g key={zone.id}>
            <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx="8" fill={c.fill} stroke={c.stroke} strokeWidth="2" />
            {s === 'CRITICAL' && (
              <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx="8" fill="none" stroke={c.stroke} strokeWidth="3" opacity="0.6">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="0.8s" repeatCount="indefinite" />
              </rect>
            )}
            <text x={zone.x + zone.w / 2} y={zone.y + 30} textAnchor="middle" fill={c.text} fontSize="12" fontWeight="800">{zone.id}</text>
            <text x={zone.x + zone.w / 2} y={zone.y + 50} textAnchor="middle" fill={c.text} fontSize="10">{zone.name}</text>
            <text x={zone.x + zone.w / 2} y={zone.y + 72} textAnchor="middle" fill={c.stroke} fontSize="11" fontWeight="700">{s}</text>
            <text x={zone.x + zone.w / 2} y={zone.y + 92} textAnchor="middle" fill="#475569" fontSize="10">{sensorLabel(zone, data)}</text>
          </g>
        );
      })}
      {/* Legend */}
      {Object.entries(C).map(([s, c], i) => (
        <g key={s} transform={`translate(${55 + i * 100}, 340)`}>
          <rect width="10" height="10" rx="2" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
          <text x="14" y="9" fill="#64748b" fontSize="9" fontWeight="500">{s}</text>
        </g>
      ))}
    </svg>
  );
}
```

### FILE: frontend/app/page.tsx
```tsx
'use client';
import { useSensorData } from '@/hooks/useSensorData';
import { SensorCard }    from '@/components/SensorCard';
import { RiskGauge }     from '@/components/RiskGauge';
import { AlertFeed }     from '@/components/AlertFeed';
import { SensorChart }   from '@/components/SensorChart';
import { motion }        from 'framer-motion';

export default function Dashboard() {
  const { current, history, alerts, connected } = useSensorData();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Live indicator bar */}
      <div className={`h-1 w-full transition-colors duration-500 ${connected ? 'bg-emerald-500' : 'bg-red-400'}`} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hazard Control Center</h1>
            <p className="text-slate-400 text-sm mt-0.5">Live industrial safety monitoring · 4 active sensors</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {connected ? 'Live Feed' : 'Disconnected'}
          </div>
        </div>

        {/* 4 Sensor Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SensorCard label="Gas / Smoke"  sensor="MQ-2"       value={current?.mq2}         unit="ppm" thresholds={{ warning: 200, danger: 350, critical: 600 }} icon="💨" />
          <SensorCard label="Temperature"  sensor="DHT11"      value={current?.temperature} unit="°C"  thresholds={{ warning: 38,  danger: 45,  critical: 60  }} icon="🌡️" />
          <SensorCard label="Humidity"     sensor="DHT11"      value={current?.humidity}    unit="%"   thresholds={{ warning: 25,  danger: 15,  critical: 5   }} icon="💧" invert />
          <SensorCard label="Fire / Flame" sensor="Flame Mod." value={current?.flame}       unit=""    thresholds={{ critical: 1 }} icon="🔥" binary />
        </div>

        {/* Risk Gauge + Alert Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Composite Risk Score</p>
            <RiskGauge score={current?.riskScore ?? 0} level={current?.riskLevel ?? 'SAFE'} />
            {current?.anomaly?.is_anomaly && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 w-full bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                🤖 <strong>AI Anomaly:</strong> {current.anomaly.message}
              </motion.div>
            )}
            <div className="mt-4 w-full grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-400">Rain/Leakage</p>
                <p className="font-bold text-slate-700">{current?.rain ? '💧 WET' : '✅ Dry'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-400">Humidity</p>
                <p className="font-bold text-slate-700">{current?.humidity?.toFixed(1) ?? '—'}%</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Live Alert Feed</p>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{alerts.length} alerts</span>
            </div>
            <AlertFeed alerts={alerts} />
          </div>
        </div>

        {/* Live Charts 2x2 */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">60-Second Rolling Window</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SensorChart title="Gas Level — MQ-2"     data={history.map(h => ({ x: h.timestamp, y: h.mq2 }))}         color="#3b82f6" unit="ppm" dangerLine={400} />
            <SensorChart title="Temperature — DHT11"   data={history.map(h => ({ x: h.timestamp, y: h.temperature }))} color="#f97316" unit="°C"  dangerLine={45}  />
            <SensorChart title="Humidity — DHT11"      data={history.map(h => ({ x: h.timestamp, y: h.humidity }))}    color="#06b6d4" unit="%" />
            <SensorChart title="Composite Risk Score"  data={history.map(h => ({ x: h.timestamp, y: h.riskScore }))}   color="#8b5cf6" unit="/100" dangerLine={66} />
          </div>
        </div>
      </main>
    </div>
  );
}
```

### FILE: frontend/app/analytics/page.tsx
```tsx
'use client';
import { useState, useEffect } from 'react';
import dynamic                 from 'next/dynamic';
import { fetchHistory, fetchCompliance } from '@/lib/api';
import type { ComplianceRecord }         from '@/types';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function AnalyticsPage() {
  const [history,    setHistory]    = useState<any[]>([]);
  const [compliance, setCompliance] = useState<ComplianceRecord[]>([]);
  const [range,      setRange]      = useState('24h');

  useEffect(() => {
    fetchHistory(range).then(setHistory);
    fetchCompliance().then(setCompliance);
  }, [range]);

  const makeData = (field: string) =>
    history.filter(h => h._field === field).map(h => ({ x: new Date(h._time).getTime(), y: h._value }));

  const areaOpts = (color: string, unit: string, dangerLine?: number) => ({
    chart:       { type: 'area' as const, background: 'transparent', toolbar: { show: false } },
    colors:      [color],
    stroke:      { curve: 'smooth' as const, width: 2 },
    fill:        { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
    xaxis:       { type: 'datetime' as const, labels: { style: { colors: '#94a3b8', fontSize: '10px' } } },
    yaxis:       { labels: { style: { colors: '#94a3b8', fontSize: '10px' }, formatter: (v: number) => `${v.toFixed(0)}${unit}` } },
    grid:        { borderColor: '#f1f5f9', strokeDashArray: 3 },
    dataLabels:  { enabled: false },
    annotations: dangerLine ? { yaxis: [{ y: dangerLine, borderColor: '#ef4444', strokeDashArray: 4, label: { text: 'Danger', style: { color: '#fff', background: '#ef4444', fontSize: '9px' } } }] } : {},
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900">Analytics</h1>
        <div className="flex gap-2">
          {['1h','6h','24h','7d'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${range === r ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { title: 'Risk Score',       field: 'risk_score',  color: '#8b5cf6', unit: '/100', danger: 66  },
          { title: 'Gas Level (MQ-2)', field: 'mq2',         color: '#3b82f6', unit: 'ppm',  danger: 400 },
          { title: 'Temperature',      field: 'temperature', color: '#f97316', unit: '°C',   danger: 45  },
          { title: 'Humidity',         field: 'humidity',    color: '#06b6d4', unit: '%' },
        ].map(({ title, field, color, unit, danger }) => (
          <div key={field} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
            <Chart options={areaOpts(color, unit, danger)} series={[{ name: title, data: makeData(field) }]} type="area" height={180} />
          </div>
        ))}
      </div>

      {/* Compliance Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Safety Compliance Log</h3>
          <span className="text-xs text-slate-400">Last 30 days</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                {['Date','Zone','Safe Time','Unsafe Time','Compliance'].map(h => (
                  <th key={h} className="text-left px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {compliance.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-600">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-3 text-slate-700 font-medium">{r.zone}</td>
                  <td className="px-5 py-3 text-emerald-700 font-medium">{r.safeMinutes}m</td>
                  <td className="px-5 py-3 text-red-600 font-medium">{r.unsafeMinutes}m</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${r.safePercentage}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-10 text-right">{r.safePercentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {!compliance.length && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No data yet — start the simulator first</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

### FILE: frontend/app/map/page.tsx
```tsx
'use client';
import { useSensorData } from '@/hooks/useSensorData';
import { FloorMap }      from '@/components/FloorMap';

export default function MapPage() {
  const { current, connected } = useSensorData();
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Digital Twin — Factory Floor</h1>
          <p className="text-slate-400 text-sm mt-0.5">Real-time zone status from live sensor readings</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          {connected ? '● Live' : '○ Offline'}
        </span>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <FloorMap data={current} />
      </div>
      {/* Live readings summary below map */}
      {current && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Zone A — Gas',     value: `${current.mq2.toFixed(0)} ppm`,         sensor: 'MQ-2'  },
            { label: 'Zone B — Temp',    value: `${current.temperature.toFixed(1)}°C`,   sensor: 'DHT11' },
            { label: 'Zone C — Flame',   value: current.flame ? '🔥 FIRE' : '✅ Clear',  sensor: 'Flame' },
            { label: 'Zone D — Rain',    value: current.rain  ? '💧 Wet'   : '✅ Dry',   sensor: 'Rain'  },
          ].map(item => (
            <div key={item.label} className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-400">{item.sensor}</p>
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              <p className="font-bold text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### FILE: frontend/app/incidents/page.tsx
```tsx
'use client';
import { useState, useEffect } from 'react';
import { motion }              from 'framer-motion';
import jsPDF                   from 'jspdf';
import autoTable               from 'jspdf-autotable';
import { fetchIncidents, acknowledgeAlert } from '@/lib/api';
import { fmtFull }             from '@/lib/utils';
import type { Incident }       from '@/types';

const TYPE_CFG = {
  WARNING:  { badge: 'bg-amber-100 text-amber-800',  dot: 'bg-amber-500',  icon: '⚠️' },
  DANGER:   { badge: 'bg-orange-100 text-orange-800',dot: 'bg-orange-500', icon: '🔥' },
  CRITICAL: { badge: 'bg-red-100 text-red-800',      dot: 'bg-red-500',    icon: '🚨' },
};

function downloadPDF(incident: Incident) {
  const doc = new jsPDF();
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 210, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('INDUSTRIAL HAZARD INCIDENT REPORT', 15, 17);
  doc.setFontSize(9);  doc.setFont('helvetica', 'normal');
  doc.text('HazardGuard Industrial Safety System', 15, 26);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 33);
  doc.setTextColor(0, 0, 0);
  autoTable(doc, {
    startY: 48,
    head: [['Field', 'Value']],
    body: [
      ['Incident ID',   incident.id],
      ['Alert Type',    incident.type],
      ['Sensor',        incident.sensor],
      ['Reading Value', `${incident.value}`],
      ['Message',       incident.message],
      ['Date & Time',   fmtFull(incident.createdAt)],
      ['Status',        incident.acknowledged ? 'Acknowledged' : 'Pending Review'],
    ],
    headStyles:         { fillColor: [30, 64, 175], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles:             { fontSize: 11, cellPadding: 6 },
  });
  doc.save(`incident-${incident.id.slice(0, 8)}.pdf`);
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter,    setFilter]    = useState('ALL');

  useEffect(() => { fetchIncidents().then(setIncidents); }, []);

  const handleAck = async (id: string) => {
    await acknowledgeAlert(id);
    setIncidents(p => p.map(i => i.id === id ? { ...i, acknowledged: true } : i));
  };

  const filtered = filter === 'ALL' ? incidents : incidents.filter(i => i.type === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-900">Incident Log</h1>
        <div className="flex gap-2">
          {['ALL','WARNING','DANGER','CRITICAL'].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === t ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(incident => {
          const cfg = TYPE_CFG[incident.type as keyof typeof TYPE_CFG] ?? TYPE_CFG.WARNING;
          return (
            <motion.div key={incident.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{cfg.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{incident.type}</span>
                      <span className="text-sm font-semibold text-slate-800">{incident.sensor}</span>
                      {!incident.acknowledged && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Pending</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{incident.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{fmtFull(incident.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!incident.acknowledged && (
                    <button onClick={() => handleAck(incident.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                      Acknowledge
                    </button>
                  )}
                  <button onClick={() => downloadPDF(incident)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    📄 PDF
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        {!filtered.length && (
          <div className="text-center py-16 text-slate-300">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">No incidents found</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## USER ACTIONS — DO THESE IN ORDER

### 1. Accounts to Create (Free)
```
□ Supabase       → supabase.com       → Create project → copy DATABASE_URL from Settings > Database
□ InfluxDB Cloud → cloud.influxdata.com → Free plan → Create bucket "hazard-sensors" → copy URL, token, org
□ ThingSpeak     → thingspeak.com     → New Channel → 5 fields (MQ2, Temp, Humidity, Flame, Rain) → copy Write API Key + Channel ID
□ Telegram Bot   → Open Telegram → @BotFather → /newbot → copy token
                  → Then message your bot, open: https://api.telegram.org/bot<TOKEN>/getUpdates → copy chat_id
□ Gmail App Pass → Google Account → Security → 2FA → App Passwords → generate one for "Mail"
```

### 2. Google Sheets Setup
```
□ Create a Google Sheet
□ Row 1 headers: Timestamp | Type | Sensor | Value | Message | Risk Score
□ Go to console.cloud.google.com → New Project → Enable "Google Sheets API"
□ IAM → Service Accounts → Create → Download JSON key → rename to google-credentials.json
□ Place google-credentials.json in backend/ folder
□ Share your Google Sheet with the service account email (from the JSON file)
□ Copy the Sheet ID from the URL (long string between /d/ and /edit)
```

### 3. Fill .env Files
```
□ Fill backend/.env with all values from step 1 & 2
□ frontend/.env.local → NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 4. Install & Run Commands (run each in a separate terminal)

**Terminal 1 — Backend**
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

**Terminal 2 — ML Service**
```bash
cd ml-service
pip install -r requirements.txt
python main.py
# Wait for it to start, then in a new terminal:
python train.py
```

**Terminal 3 — Frontend**
```bash
cd frontend
npm install
npx shadcn-ui@latest init   # Choose: TypeScript, Tailwind, src/no, app/, yes alias
npx shadcn-ui@latest add button badge card table tabs
npm run dev
```

**Terminal 4 — Simulator**
```bash
cd simulator
npm install
npm run dev
```

### 5. Verify Everything Works
```
□ Open http://localhost:3000 — dashboard should show live data
□ Sensor cards should update every 2 seconds
□ Risk gauge should animate
□ Wait ~40 seconds → simulator enters SPIKE mode → AI anomaly should fire
□ Wait ~70 seconds → WARNING alert should fire → check Telegram + Email
□ Wait ~110 seconds → CRITICAL alert → check all 3 channels + Google Sheets
□ Open /analytics → check charts have data
□ Open /map → zones should change color with sensor status
□ Open /incidents → click PDF → confirm download works
□ Check ThingSpeak channel → data should appear every 2 seconds
```

### 6. Ports Reference
```
Frontend    → http://localhost:3000
Backend     → http://localhost:4000
ML Service  → http://localhost:8000
MQTT Broker → broker.hivemq.com (public, free)
```

---
*End of Hazard.md — Generated for HazardGuard Industrial Safety System*
