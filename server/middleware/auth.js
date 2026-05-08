const jwt = require('jsonwebtoken');

/**
 * Verify JWT from Authorization header or cookie.
 * Attaches decoded payload to req.user.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

/**
 * Require admin role.
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
}

/**
 * Require school staff role.
 */
function requireStaff(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Staff access required.' });
    }
    next();
  });
}

function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

module.exports = { requireAuth, requireAdmin, requireStaff };
