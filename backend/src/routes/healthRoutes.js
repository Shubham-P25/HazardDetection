const express = require('express');
const { snapshot, state } = require('../runtimeState');
const config = require('../config');
const thresholds = require('../config/thresholds');
const zones = require('../config/zones');
const { getAuth } = require('@clerk/express');
const { resolveRole, clerkEnabled } = require('../middleware/auth');

const router = express.Router();

// B2: use getAuth(req) to check sign-in, not req.auth?.userId (which was never truthy)
router.get('/health', (req, res) => {
  const publicView = {
    ...snapshot(req.io),
    deviceOfflineMs: config.STALE_AFTER_MS,
  };
  // Add extra info for signed-in users
  const auth = clerkEnabled() ? getAuth(req) : { userId: 'local' };
  if (auth?.userId) {
    publicView.lastReading = state.lastReading;
    publicView.mqttTopic = config.MQTT_TOPIC;
  }
  res.json(publicView);
});

router.get('/config', (req, res) => {
  res.json({
    thresholds,
    zones,
    mqttTopic: config.MQTT_TOPIC,
    simulator: config.SIMULATOR,
    deviceOfflineMs: config.STALE_AFTER_MS,
  });
});

// B3 step 4: GET /api/me
router.get('/me', async (req, res) => {
  if (!req.user && !req.clerk) return res.json({ userId: null, role: 'viewer' });
  const user = req.user || {};
  res.json({
    userId: req.clerk?.userId || null,
    role: req.userRole || 'viewer',
    email: user.email || null,
    name: user.name || null,
    notifyEmail: user.notifyEmail || null,
    notifyTelegramChatId: user.notifyTelegramChatId || null,
  });
});

// D7: PATCH /api/me - update notification preferences
router.patch('/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { notifyEmail, notifyTelegramChatId } = req.body || {};
  // Validate email format if provided
  if (notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  // Validate Telegram chat ID (digits, optionally negative)
  if (notifyTelegramChatId && !/^-?\d+$/.test(String(notifyTelegramChatId))) {
    return res.status(400).json({ error: 'Invalid Telegram chat ID (must be a number)' });
  }
  const updated = await req.prisma.user.update({
    where: { clerkId: req.clerk.userId },
    data: {
      ...(notifyEmail !== undefined ? { notifyEmail: notifyEmail || null } : {}),
      ...(notifyTelegramChatId !== undefined ? { notifyTelegramChatId: notifyTelegramChatId ? String(notifyTelegramChatId) : null } : {}),
    },
  });
  res.json({ ok: true, notifyEmail: updated.notifyEmail, notifyTelegramChatId: updated.notifyTelegramChatId });
});

module.exports = router;
