require('dotenv').config();

const express    = require('express');
const path       = require('path');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const authRoutes          = require('./routes/auth');
const submissionRoutes    = require('./routes/submissions');
const staffRoutes         = require('./routes/staff');
const adminRoutes         = require('./routes/admin');
const notificationRoutes  = require('./routes/notifications');

const app  = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

/* ══════════════════════════════════════════════════════
   SECURITY HEADERS (Helmet)
   Sets X-Frame-Options, X-Content-Type-Options,
   Strict-Transport-Security, Referrer-Policy, etc.
══════════════════════════════════════════════════════ */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
      styleSrc:    ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com', 'fonts.googleapis.com'],
      fontSrc:     ["'self'", 'fonts.gstatic.com', 'cdnjs.cloudflare.com'],
      imgSrc:      ["'self'", 'data:', 'blob:'],
      connectSrc:  ["'self'"],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // allow CDN fonts/icons
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

/* ══════════════════════════════════════════════════════
   CORS — only allow same origin in production
══════════════════════════════════════════════════════ */
app.use(cors({
  origin: isProd ? false : 'http://localhost:3000',
  credentials: true,
}));

/* ══════════════════════════════════════════════════════
   RATE LIMITING
   — General API: 100 req / 15 min per IP
   — Auth endpoints: 10 attempts / 15 min per IP
   — File uploads: 20 req / hour per IP
══════════════════════════════════════════════════════ */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: (req) => !req.path.startsWith('/api'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
  skipSuccessfulRequests: true, // only count failed attempts
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Upload limit reached. Please try again in an hour.' },
});

app.use(generalLimiter);

/* ══════════════════════════════════════════════════════
   BODY PARSING — strict size limits
══════════════════════════════════════════════════════ */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ══════════════════════════════════════════════════════
   SECURITY MIDDLEWARE — strip dangerous headers
══════════════════════════════════════════════════════ */
app.use((req, res, next) => {
  // Remove server fingerprinting
  res.removeHeader('X-Powered-By');
  next();
});

/* ══════════════════════════════════════════════════════
   API ROUTES
══════════════════════════════════════════════════════ */
app.use('/api/auth/staff/login',    authLimiter);
app.use('/api/auth/admin/login',    authLimiter);
app.use('/api/auth/staff/register', authLimiter);
app.use('/api/submissions',         uploadLimiter);

app.use('/api/auth',          authRoutes);
app.use('/api/submissions',   submissionRoutes);
app.use('/api/staff',         staffRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationRoutes);

/* ══════════════════════════════════════════════════════
   HEALTH CHECK (no sensitive info)
══════════════════════════════════════════════════════ */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* ══════════════════════════════════════════════════════
   STATIC FILES — no-cache for HTML
══════════════════════════════════════════════════════ */
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use(express.static(path.join(__dirname, '../public'), {
  // Cache static assets (CSS/JS/images) for 1 day
  maxAge: '1d',
  etag: true,
}));

/* ══════════════════════════════════════════════════════
   SPA FALLBACK
══════════════════════════════════════════════════════ */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/* ══════════════════════════════════════════════════════
   GLOBAL ERROR HANDLER — never leak stack traces
══════════════════════════════════════════════════════ */
app.use((err, req, res, next) => {
  // Log full error server-side
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);

  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ error: 'File exceeds 20MB limit.' });

  if (err.type === 'entity.too.large')
    return res.status(413).json({ error: 'Request body too large.' });

  // Never send stack traces to client in production
  res.status(500).json({
    error: isProd ? 'An unexpected error occurred. Please try again.' : err.message,
  });
});

/* ══════════════════════════════════════════════════════
   STARTUP
══════════════════════════════════════════════════════ */
app.listen(PORT, async () => {
  console.log(`SMME Portal running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`DATABASE_URL set: ${!!process.env.DATABASE_URL}`);
  console.log(`JWT_SECRET set: ${!!process.env.JWT_SECRET}`);

  try {
    const pool = require('./db/pool');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');

    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
    );
    const tableNames = tables.rows.map(r => r.table_name);

    if (tableNames.length === 0) {
      console.log('⚠️  No tables found — running migrations...');
      const { execSync } = require('child_process');
      try {
        execSync('node server/db/migrate.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        execSync('node server/db/seed.js',    { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        console.log('✅ Auto-migration complete');
      } catch (migErr) {
        console.error('❌ Auto-migration failed:', migErr.message);
      }
    } else {
      console.log('Tables found:', tableNames.join(', '));
      try {
        const { rows } = await pool.query('SELECT COUNT(*) FROM schools');
        if (parseInt(rows[0].count) < 38) {
          console.log('⚠️  School list outdated — re-seeding...');
          const { execSync } = require('child_process');
          execSync('node server/db/seed.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
          console.log('✅ Schools re-seeded');
        }
      } catch {}
    }
  } catch (err) {
    console.error('❌ Database connection FAILED:', err.message);
  }
});
