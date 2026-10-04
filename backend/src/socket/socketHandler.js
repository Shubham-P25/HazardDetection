function setupSocket(io, prisma) {
  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);
    try {
      const incidents = await prisma.incident.findMany({
        take: 20,
        orderBy: { startedAt: 'desc' },
        include: { alerts: true },
      });
      incidents.reverse().forEach((incident) => socket.emit('incident:update', incident));
    } catch (error) {
      console.error('Socket incident hydrate error:', error.message);
    }
  });
}

module.exports = { setupSocket };
