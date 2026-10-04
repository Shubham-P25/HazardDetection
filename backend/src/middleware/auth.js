const { verifyToken, createClerkClient } = require('@clerk/backend');
const { clerkMiddleware, requireAuth, getAuth } = require('@clerk/express');
const config = require('../config');

function clerkEnabled() {
  return Boolean(config.CLERK_SECRET_KEY);
}

// In-memory role cache: { [userId]: { role, name, email, fetchedAt } }
const roleCache = new Map();
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Per-user syncUser throttle
const syncThrottle = new Map();
const SYNC_THROTTLE_MS = 5 * 60 * 1000;

let clerkClientSingleton = null;
function getClerkClient() {
  if (!clerkClientSingleton && config.CLERK_SECRET_KEY) {
    clerkClientSingleton = createClerkClient({ secretKey: config.CLERK_SECRET_KEY });
  }
  return clerkClientSingleton;
}

// Resolve role from session claims or Clerk API (B3)
async function resolveRole(auth) {
  if (!auth?.userId) return 'viewer';

  // Try session claims first (B3 step 2)
  const claimPath = config.CLERK_ROLE_CLAIM || 'metadata.role';
  const claims = auth.sessionClaims || {};
  let role = claimPath.split('.').reduce((obj, key) => (obj && typeof obj === 'object' ? obj[key] : undefined), claims);

  if (role) {
    roleCache.set(auth.userId, { role, fetchedAt: Date.now() });
    return role;
  }

  // Check cache
  const cached = roleCache.get(auth.userId);
  if (cached && Date.now() - cached.fetchedAt < ROLE_CACHE_TTL_MS) return cached.role || 'viewer';

  // Fetch from Clerk API once
  try {
    const client = getClerkClient();
    if (client) {
      const user = await client.users.getUser(auth.userId);
      role = user.publicMetadata?.role || 'viewer';
      roleCache.set(auth.userId, { role, email: user.emailAddresses?.[0]?.emailAddress, name: user.fullName, fetchedAt: Date.now() });
      return role;
    }
  } catch (error) {
    console.warn('Clerk role fetch failed:', error.message);
  }
  return 'viewer';
}

// B3 step 3: only sync when values actually changed, throttled
async function syncUser(prisma, auth) {
  if (!prisma || !auth?.userId) return null;
  const lastSync = syncThrottle.get(auth.userId);
  if (lastSync && Date.now() - lastSync < SYNC_THROTTLE_MS) {
    // Return cached user without a DB write
    return prisma.user.findUnique({ where: { clerkId: auth.userId } });
  }
  syncThrottle.set(auth.userId, Date.now());

  const role = await resolveRole(auth);
  const cached = roleCache.get(auth.userId);
  const email = cached?.email || null;
  const name = cached?.name || null;

  const existing = await prisma.user.findUnique({ where: { clerkId: auth.userId } });
  if (!existing) {
    return prisma.user.create({ data: { clerkId: auth.userId, role, email, name } });
  }
  // Only update when something changed
  const changed = existing.role !== role || (email && existing.email !== email) || (name && existing.name !== name);
  if (!changed) return existing;
  return prisma.user.update({ where: { clerkId: auth.userId }, data: { role, ...(email ? { email } : {}), ...(name ? { name } : {}) } });
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
      // B2: store as req.clerk, not req.auth (do not clobber @clerk/express property)
      req.clerk = auth;
      req.user = await syncUser(prisma, auth);
      req.userRole = req.user?.role || await resolveRole(auth);
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
    // B3: resolve role from claim path, not hard-coded publicMetadata
    const claimPath = config.CLERK_ROLE_CLAIM || 'metadata.role';
    const role = claimPath.split('.').reduce((obj, key) => (obj && typeof obj === 'object' ? obj[key] : undefined), payload) || 'viewer';
    socket.userRole = role;
    next();
  } catch (error) {
    next(new Error('Unauthorized'));
  }
}

module.exports = { clerkMiddleware, requireAuth, apiAuth, requireRole, socketAuth, clerkEnabled, syncUser, getClerkClient, resolveRole };
