const { verifyToken } = require('@clerk/backend');
const { clerkMiddleware, requireAuth, getAuth } = require('@clerk/express');
const config = require('../config');

function clerkEnabled() {
  return Boolean(config.CLERK_SECRET_KEY);
}

async function syncUser(prisma, auth) {
  if (!prisma || !auth?.userId) return null;
  const role = auth.sessionClaims?.publicMetadata?.role
    || auth.sessionClaims?.metadata?.role
    || 'viewer';
  return prisma.user.upsert({
    where: { clerkId: auth.userId },
    update: { role },
    create: { clerkId: auth.userId, role },
  });
}

function apiAuth(prisma) {
  return async (req, res, next) => {
    if (req.path === '/health' || req.originalUrl === '/api/health') return next();
    if (req.path === '/sensors/reading' || req.originalUrl.startsWith('/api/sensors/reading')) return next();
    if (!clerkEnabled()) {
      req.userRole = 'admin';
      return next();
    }
    try {
      const auth = getAuth(req);
      if (!auth?.userId) return res.status(401).json({ error: 'Unauthorized' });
      req.auth = auth;
      req.user = await syncUser(prisma, auth);
      req.userRole = req.user?.role || 'viewer';
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.userRole || 'viewer';
    if (!roles.includes(role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

async function socketAuth(socket, next) {
  if (!clerkEnabled()) return next();
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Unauthorized'));
    const payload = await verifyToken(token, { secretKey: config.CLERK_SECRET_KEY });
    socket.userId = payload.sub;
    socket.userRole = payload.publicMetadata?.role || 'viewer';
    next();
  } catch (error) {
    next(new Error('Unauthorized'));
  }
}

module.exports = { clerkMiddleware, requireAuth, apiAuth, requireRole, socketAuth, clerkEnabled, syncUser };
