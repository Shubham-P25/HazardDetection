const express = require('express');
const { queryInflux, queryHistory, bucketForRange } = require('../influx');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// B4: whitelist for Flux field injection
const ALLOWED_FIELDS = new Set(['gas', 'smoke', 'temperature', 'humidity', 'flame', 'drainage', 'heatIndex', 'dewPoint', 'riskScore']);
const ALLOWED_BUCKETS = new Set(['raw', '1m', '15m', '1h']);
const MAX_SPAN_MS = 31 * 24 * 60 * 60 * 1000; // 31 days

function validateHistoryParams({ field, from, to, bucket, range }) {
  if (field && !ALLOWED_FIELDS.has(field)) return 'Invalid field. Allowed: ' + [...ALLOWED_FIELDS].join(', ');
  if (bucket && !ALLOWED_BUCKETS.has(bucket)) return 'Invalid bucket. Allowed: ' + [...ALLOWED_BUCKETS].join(', ');
  if (range && !/^\d+(m|h|d)$/.test(range)) return 'Invalid range format';
  if (from || to) {
    const f = from ? Date.parse(from) : null;
    const t = to ? Date.parse(to) : null;
    if (from && Number.isNaN(f)) return 'Invalid from date';
    if (to && Number.isNaN(t)) return 'Invalid to date';
    if (f && t && f >= t) return 'from must be before to';
    if (f && t && (t - f) > MAX_SPAN_MS) return 'Date range must be 31 days or less';
  }
  return null;
}

router.get('/history', async (req, res, next) => {
  try {
    const { field, from, to, bucket, range, fields } = req.query;

    // B4 validation
    const err = validateHistoryParams({ field, from, to, bucket, range });
    if (err) return res.status(400).json({ error: err });

    // Batched multi-field query (E1)
    if (fields) {
      const fieldList = fields.split(',').map((f) => f.trim()).filter((f) => ALLOWED_FIELDS.has(f));
      if (!fieldList.length) return res.status(400).json({ error: 'No valid fields specified' });
      const start = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const stop = to || new Date().toISOString();
      const bkt = bucket || bucketForRange(start, stop);
      const results = await Promise.all(fieldList.map((f) => queryHistory({ field: f, from: start, to: stop, bucket: bkt })));
      const combined = {};
      fieldList.forEach((f, i) => { combined[f] = results[i]; });
      return res.json({ fields: fieldList, from: start, to: stop, bucket: bkt, data: combined });
    }

    if (field || from || to) {
      const start = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const stop = to || new Date().toISOString();
      const bkt = bucket || bucketForRange(start, stop);
      const rows = await queryHistory({ field: field || 'temperature', from: start, to: stop, bucket: bkt });
      return res.json({
        field: field || 'temperature',
        from: start,
        to: stop,
        bucket: bkt,
        points: rows,
        empty: rows.length === 0,
      });
    }
    res.json(await queryInflux(range));
  } catch (error) { next(error); }
});

router.get('/compliance', async (req, res, next) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    since.setHours(0, 0, 0, 0);
    const records = await req.prisma.complianceRecord.findMany({
      where: { date: { gte: since } },
      orderBy: [{ date: 'desc' }, { zone: 'asc' }],
    });
    res.json(records.map((record) => ({
      ...record,
      compliancePct: Math.round((record.safeMinutes / Math.max(record.safeMinutes + record.unsafeMinutes, 1)) * 100),
      safePercentage: Math.round((record.safeMinutes / Math.max(record.safeMinutes + record.unsafeMinutes, 1)) * 100),
    })));
  } catch (error) { next(error); }
});

router.get('/hazards', async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.offset) || 0;
    const where = {};
    if (req.query.severity) where.severity = req.query.severity;
    if (req.query.sensor) where.sensorField = req.query.sensor;
    if (req.query.from || req.query.to) {
      where.startedAt = {};
      if (req.query.from) where.startedAt.gte = new Date(req.query.from);
      if (req.query.to) where.startedAt.lte = new Date(req.query.to);
    }
    const [items, total] = await Promise.all([
      req.prisma.incident.findMany({ where, take, skip, orderBy: { startedAt: 'desc' }, include: { alerts: true } }),
      req.prisma.incident.count({ where }),
    ]);
    res.json({ items, total, layout: 'pending reference' });
  } catch (error) { next(error); }
});

router.post('/export/sheets', requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const { exportToSheets } = require('../alerts/sheets');
    const userEmail = req.user?.email || null;
    const result = await exportToSheets({ ...req.body, userEmail }, req.prisma);
    res.json(result);
  } catch (error) { next(error); }
});

module.exports = router;
