const { state } = require('../runtimeState');

function setupSocket(io, prisma) {
  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);

    // C1: send last reading and ring-buffer history immediately so cards fill without waiting
    if (state.lastReading || state.readingBuffer?.length) {
      socket.emit('sensor:snapshot', {
        current: state.lastReading,
        history: state.readingBuffer || [],
      });
    }

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
