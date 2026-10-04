const express = require('express');
const { processReading } = require('../services/readingPipeline');
const { queryInflux } = require('../influx');
const router = express.Router();

router.post('/reading', async (req, res) => {
  try {
    res.status(202).json({ success: true, ...(await processReading(req.body, req)) });
  } catch (error) {
    console.error('Reading processing error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.get('/latest', async (_req, res, next) => {
  try {
    const data = await queryInflux('1h');
    res.json(data.at(-1) || null);
  } catch (error) { next(error); }
});

module.exports = router;
