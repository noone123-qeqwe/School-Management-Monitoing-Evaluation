const jwt = require('jsonwebtoken');

/**
 * Verify JWT from Authorization header.
 * Validates signature, expiry, and issuer.
 * Attaches decoded payload to req.user.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'smme-portal',
      algorithms: ['HS256'], // explicitly allow only HS256
    });
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    if (err.name === 'JsonWebTokenError')
      return res.status(401).json({ error: 'Invalid session. Please log in again.' });
    return res.status(401).json({ error: 'Authentication failed.' });
  }
}

/**
 * Require admin role.
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Admin access required.' });
    next();
  });
}

/**
 * Require school staff role.
 */
function requireStaff(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'staff')
      return res.status(403).json({ error: 'Staff access required.' });
    next();
  });
}

/**
 * Extract token from Authorization header only.
 * Never from query strings (prevents token leakage in logs).
 */
function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ') && auth.length > 7) {
    return auth.slice(7);
  }
  return null;
}

module.exports = { requireAuth, requireAdmin, requireStaff };
