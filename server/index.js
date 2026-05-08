require('dotenv').config();

const express = require('express');
const path    = require('path');
const cors    = require('cors');

const authRoutes          = require('./routes/auth');
const submissionRoutes    = require('./routes/submissions');
const staffRoutes         = require('./routes/staff');
const adminRoutes         = require('./routes/admin');
const notificationRoutes  = require('./routes/notifications');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── API Routes ── */
app.use('/api/auth',          authRoutes);
app.use('/api/submissions',   submissionRoutes);
app.use('/api/staff',         staffRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationRoutes);

/* ── Health check ── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── No-cache for HTML files (forces browser to always fetch fresh HTML) ── */
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

/* ── Serve frontend static files ── */
app.use(express.static(path.join(__dirname, '../public')));

/* ── SPA fallback – serve index.html for any unmatched route ── */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/* ── Error handler ── */
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ error: 'File exceeds 20MB limit.' });
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`SMME Portal running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
