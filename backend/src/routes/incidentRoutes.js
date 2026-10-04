const express = require('express');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.offset) || 0;
    const where = {};
    if (req.query.severity && req.query.severity !== 'ALL') where.severity = req.query.severity;
    if (req.query.status === 'OPEN') where.status = { in: ['OPEN', 'ACKNOWLEDGED'] };
    if (req.query.status === 'RESOLVED') where.status = 'RESOLVED';
    if (req.query.from || req.query.to) {
      where.startedAt = {};
      if (req.query.from) where.startedAt.gte = new Date(req.query.from);
      if (req.query.to) where.startedAt.lte = new Date(req.query.to);
    }
    const [items, total, openCount] = await Promise.all([
      req.prisma.incident.findMany({ where, take, skip, orderBy: { startedAt: 'desc' }, include: { alerts: true } }),
      req.prisma.incident.count({ where }),
      req.prisma.incident.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } }),
    ]);
    res.json({ items, total, openCount });
  } catch (error) { next(error); }
});

router.patch('/:id/acknowledge', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const incident = await req.prisma.incident.update({
      where: { id: req.params.id },
      data: { status: 'ACKNOWLEDGED', acknowledgedByClerkId: req.clerk?.userId || 'operator' },
      include: { alerts: true },
    });
    req.io?.emit('incident:update', incident);
    res.json(incident);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.patch('/:id/resolve', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const incident = await req.prisma.incident.update({
      where: { id: req.params.id },
      data: { status: 'RESOLVED', resolvedAt: new Date(), note: req.body?.note || null },
      include: { alerts: true },
    });
    req.io?.emit('incident:update', incident);
    res.json(incident);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

module.exports = router;
