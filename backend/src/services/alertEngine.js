const config = require('../config');
const thresholds = require('../config/thresholds');
const zones = require('../config/zones');
const { sendTelegramAlert } = require('../alerts/telegram');
const { sendEmailAlert } = require('../alerts/email');

const locks = new Map();
const lastAlertAt = new Map();
const lastUnsafeAt = new Map();

function withLock(key, operation) {
  const previous = locks.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  locks.set(key, current.finally(() => { if (locks.get(key) === current) locks.delete(key); }));
  return current;
}

function zoneForField(field) {
  return zones.sensors.find((sensor) => sensor.field === field)?.roomId || 'plant';
}

function unitFor(field) {
  return thresholds.fields[field]?.unit || '';
}

async function recipients(prisma) {
  const users = prisma ? await prisma.user.findMany({
    where: { OR: [{ notifyEmail: { not: null } }, { notifyTelegramChatId: { not: null } }] },
  }).catch(() => []) : [];
  const emails = new Set(users.map((user) => user.notifyEmail).filter(Boolean));
  const chats = new Set(users.map((user) => user.notifyTelegramChatId).filter(Boolean));
  if (config.EMAIL_TO) emails.add(config.EMAIL_TO);
  if (config.TELEGRAM_CHAT_ID) chats.add(String(config.TELEGRAM_CHAT_ID));
  return { emails: [...emails], chats: [...chats] };
}

async function recordAlert(prisma, incidentId, channel, recipient, send) {
  try {
    await send();
    if (prisma) {
      await prisma.incidentAlert.create({
        data: { incidentId, channel, recipient, status: 'SENT', sentAt: new Date() },
      });
    }
  } catch (error) {
    if (prisma) {
      await prisma.incidentAlert.create({
        data: {
          incidentId, channel, recipient, status: 'FAILED', error: error.message, sentAt: new Date(),
        },
      });
    }
    console.error(`${channel} alert error:`, error.message);
  }
}

async function dispatchAlerts(prisma, incident, kind) {
  const key = `${incident.id}:${kind}`;
  const last = lastAlertAt.get(key) || 0;
  if (kind === 'reminder' && Date.now() - last < thresholds.alertReminderMs) return;
  lastAlertAt.set(key, Date.now());
  const { emails, chats } = await recipients(prisma);
  const payload = {
    type: incident.severity,
    sensor: incident.sensorField,
    value: incident.peakValue,
    message: `${incident.sensorField} ${incident.severity} in ${incident.zone}`,
    riskScore: 0,
  };
  await Promise.all([
    ...emails.map((email) => recordAlert(prisma, incident.id, 'EMAIL', email, () => sendEmailAlert({ ...payload, to: email }))),
    ...chats.map((chat) => recordAlert(prisma, incident.id, 'TELEGRAM', chat, () => sendTelegramAlert({ ...payload, chatId: chat }))),
  ]);
}

async function processAlert(sensorData, prisma, io) {
  if (!prisma) return null;
  const now = new Date();
  const statuses = sensorData.statuses || {};

  for (const [field, level] of Object.entries(statuses)) {
    if (level !== 'SAFE') lastUnsafeAt.set(field, now.getTime());
  }

  const open = await prisma.incident.findMany({
    where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
  });
  for (const incident of open) {
    const level = statuses[incident.sensorField];
    if (level === 'SAFE') {
      const unsafeAt = lastUnsafeAt.get(incident.sensorField) || new Date(incident.startedAt).getTime();
      if (now.getTime() - unsafeAt >= thresholds.autoResolveMs) {
        const resolved = await prisma.incident.update({
          where: { id: incident.id },
          data: { status: 'RESOLVED', resolvedAt: now },
        });
        io?.emit('incident:update', resolved);
      }
    }
  }

  for (const [field, level] of Object.entries(statuses)) {
    if (!['WARNING', 'DANGER', 'CRITICAL'].includes(level)) continue;
    const key = field;
    await withLock(key, async () => {
      const active = await prisma.incident.findFirst({
        where: { sensorField: field, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
        orderBy: { startedAt: 'desc' },
      });
      const value = Number(sensorData[field]);
      const zone = sensorData.zone || zoneForField(field);
      if (active) {
        const rank = { WARNING: 1, DANGER: 2, CRITICAL: 3 };
        const next = {
          peakValue: Math.max(active.peakValue, value),
          severity: (rank[level] || 0) > (rank[active.severity] || 0) ? level : active.severity,
        };
        const updated = await prisma.incident.update({ where: { id: active.id }, data: next });
        io?.emit('incident:update', updated);
        if (next.severity !== active.severity) await dispatchAlerts(prisma, updated, 'escalation');
        else await dispatchAlerts(prisma, updated, 'reminder');
        return updated;
      }
      const created = await prisma.incident.create({
        data: {
          sensorField: field,
          zone,
          severity: level,
          peakValue: value,
          unit: unitFor(field),
          thresholdCrossed: level,
          startedAt: now,
          status: 'OPEN',
        },
      });
      io?.emit('incident:new', created);
      io?.emit('alert', created);
      await dispatchAlerts(prisma, created, 'open');
      return created;
    });
  }
  return null;
}

module.exports = { processAlert };
