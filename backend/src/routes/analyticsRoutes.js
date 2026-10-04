const express = require('express');
const { queryInflux, queryHistory, bucketForRange } = require('../influx');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/history', async (req, res, next) => {
  try {
    const { field, from, to, bucket, range } = req.query;
    if (field || from || to) {
      const start = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const stop = to || new Date().toISOString();
      const rows = await queryHistory({ field: field || 'temperature', from: start, to: stop, bucket });
      return res.json({
        field: field || 'temperature',
        from: start,
        to: stop,
        bucket: bucket || bucketForRange(start, stop),
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
      orderBy: { date: 'desc' },
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
    const result = await exportToSheets(req.body || {}, req.prisma);
    res.json(result);
  } catch (error) { next(error); }
});

module.exports = router;
