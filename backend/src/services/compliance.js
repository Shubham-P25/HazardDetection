const zones = require('../config/zones');

function dayStart(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

async function updateCompliance(reading, prisma) {
  if (!prisma) return null;
  const date = dayStart();
  const unsafe = ['WARNING', 'DANGER', 'CRITICAL'].includes(reading.riskLevel);
  const roomEntries = Object.entries(reading.roomStatuses || {});
  const targets = roomEntries.length
    ? roomEntries.filter(([, status]) => status !== 'NONE')
    : [['plant', reading.riskLevel]];

  for (const [zoneId, status] of targets) {
    const zoneUnsafe = ['WARNING', 'DANGER', 'CRITICAL'].includes(status) || unsafe;
    const zoneName = zones.rooms.find((room) => room.id === zoneId)?.name || zoneId;
    await prisma.complianceRecord.upsert({
      where: { date_zone: { date, zone: zoneName } },
      update: zoneUnsafe ? { unsafeMinutes: { increment: 0 } } : { safeMinutes: { increment: 0 } },
      create: {
        date,
        zone: zoneName,
        safeMinutes: 0,
        unsafeMinutes: 0,
      },
    });
  }

  const minuteKey = new Date().toISOString().slice(0, 16);
  if (updateCompliance.lastMinute === minuteKey) return null;
  updateCompliance.lastMinute = minuteKey;
  for (const [zoneId, status] of targets) {
    const zoneUnsafe = ['WARNING', 'DANGER', 'CRITICAL'].includes(status);
    const zoneName = zones.rooms.find((room) => room.id === zoneId)?.name || zoneId;
    await prisma.complianceRecord.upsert({
      where: { date_zone: { date, zone: zoneName } },
      update: zoneUnsafe ? { unsafeMinutes: { increment: 1 } } : { safeMinutes: { increment: 1 } },
      create: {
        date,
        zone: zoneName,
        safeMinutes: zoneUnsafe ? 0 : 1,
        unsafeMinutes: zoneUnsafe ? 1 : 0,
      },
    });
  }
  return true;
}

module.exports = { updateCompliance };
