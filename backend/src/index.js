require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const config = require('./config');
const { flushInflux } = require('./influx');
const { setupMQTT } = require('./mqtt/mqttClient');
const { setupSocket } = require('./socket/socketHandler');
const { startSimulator } = require('./services/simulator');
const { clerkMiddleware, apiAuth, socketAuth, clerkEnabled } = require('./middleware/auth');
const sensorRoutes = require('./routes/sensorRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.FRONTEND_ORIGINS, credentials: true },
  transports: ['websocket', 'polling'],
});
const prisma = new PrismaClient();
let mqttClient;
let shuttingDown = false;

function validateConfig() {
  if (!config.DATABASE_URL) throw new Error('Missing required configuration: DATABASE_URL');
  // B1: fail at startup if ingest key is missing, empty, or placeholder
  const key = config.INGEST_API_KEY;
  if (!key || key === 'CHANGE_ME' || key.trim() === '') {
    throw new Error('INGEST_API_KEY must be set to a real secret (generate with: node -e "console.log(require(\'crypto\').randomBytes(24).toString(\'hex\'))") ');
  }
  if (config.MQTT_BROKER.includes('hivemq.com') && (config.MQTT_TOPIC === 'hazard/sensors' || !config.MQTT_TOPIC_PREFIX)) {
    console.warn('[security] broker.hivemq.com is public. Set MQTT_TOPIC_PREFIX to a unique value (example: hazardguard/<random-id>) and update the NodeMCU to the same topic. Longer term, use a private broker with username and password.');
  }
}

function requireIngestKey(req, res, next) {
  const provided = req.get('x-api-key');
  const expected = config.INGEST_API_KEY;
  // Both must be non-empty strings of the same length for timingSafeEqual
  if (!provided || !expected || provided.length !== expected.length) {
    return res.status(401).json({ error: 'Invalid ingest API key' });
  }
  try {
    const match = crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!match) return res.status(401).json({ error: 'Invalid ingest API key' });
  } catch {
    return res.status(401).json({ error: 'Invalid ingest API key' });
  }
  next();
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.FRONTEND_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '32kb' }));
if (clerkEnabled()) app.use(clerkMiddleware());
app.use((req, _res, next) => { req.io = io; req.prisma = prisma; next(); });
app.use('/api/sensors/reading', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.use('/api/sensors/reading', requireIngestKey);
app.use('/api', apiAuth(prisma));
app.use('/api', healthRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', analyticsRoutes);
// B2: remove hacky /health rewrite; health is served by healthRoutes under /api/health
app.use((error, _req, res, _next) => {
  console.error('Request error:', error.message);
  if (error.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
  res.status(500).json({ error: 'Internal server error' });
});

io.use(socketAuth);

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down`);
  mqttClient?.end(true);
  await new Promise((resolve) => server.close(resolve));
  await flushInflux().catch((error) => console.error('Influx flush error:', error.message));
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => { console.error('Uncaught exception:', error); shutdown('uncaughtException'); });
// B6: log but keep running – a Telegram timeout or Prisma hiccup must not kill the server
process.on('unhandledRejection', (reason) => { console.error('Unhandled rejection (non-fatal):', reason); });

async function start() {
  validateConfig();
  await prisma.$connect();
  setupSocket(io, prisma);
  mqttClient = setupMQTT(io, prisma);
  startSimulator(io, prisma);
  server.listen(config.PORT, () => {
    console.log(`HazardGuard backend listening on http://localhost:${config.PORT}`);
    if (!clerkEnabled()) console.warn('Clerk is not configured; API and sockets are open for local development.');
  });
}

start().catch((error) => { console.error('Startup failed:', error.message); process.exit(1); });
