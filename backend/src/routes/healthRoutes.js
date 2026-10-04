const express = require('express');
const { snapshot, state } = require('../runtimeState');
const config = require('../config');
const thresholds = require('../config/thresholds');
const zones = require('../config/zones');

const router = express.Router();

router.get('/health', (req, res) => {
  const publicView = {
    ...snapshot(req.io),
    mqttTopic: config.MQTT_TOPIC,
    deviceOfflineMs: config.STALE_AFTER_MS,
  };
  if (req.auth?.userId) publicView.lastReading = state.lastReading;
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

module.exports = router;
