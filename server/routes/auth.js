'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/* ── Token signer (must use same secret resolution as ../middleware/auth.js) ── */
function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') return null;
  return 'smme_fallback_secret_dev_12345';
}

function signToken(payload) {
  const secret = resolveJwtSecret();
  if (!secret) return null;
  return jwt.sign(payload, secret, {
    expiresIn: '8h',
    issuer: 'smme-portal',
  });
}

/* ── Input sanitizer ── */
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, 500);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

/*
 * FIX 1 — DUMMY_HASH was a malformed string that caused bcrypt.compare()
 * to throw, turning "user not found" cases into 500 errors instead of
 * clean 401 responses.  Generate a real hash once at startup instead.
 */
const DUMMY_HASH = bcrypt.hashSync('dummy-prevent-timing-attack', 10);

/* ─────────────────────────────────────────────
   POST /api/auth/staff/login
───────────────────────────────────────────── */
router.post('/staff/login', async (req, res) => {
  const email = sanitize(req.body.email || '').toLowerCase();
  const password = req.body.password;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  if (!isValidEmail(email))
    return res.status(400).json({ error: 'Invalid email format.' });

  if (typeof password !== 'string' || password.length < 1 || password.length > 128)
    return res.status(400).json({ error: 'Invalid password.' });

  try {
    // Find staff by email only — school dropdown was removed from the UI.
    // If a staff member exists in multiple schools, prefer the approved one.
    const result = await pool.query(
      `SELECT s.id, s.first_name, s.last_name, s.email, s.password,
              s.position, s.status, s.school_id, s.phone,
              sc.name AS school_name, sc.level AS school_level,
              sc.school_code, sc.division
       FROM staff s
       LEFT JOIN schools sc ON sc.id = s.school_id
       WHERE LOWER(s.email) = $1
       ORDER BY CASE s.status WHEN 'approved' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END
       LIMIT 1`,
      [email]
    );

    const staff = result.rows[0];

    // Always run bcrypt to prevent timing attacks
    const hashToCompare = staff?.password || DUMMY_HASH;
    const match = await bcrypt.compare(password, hashToCompare);

    if (!staff || !match)
      return res.status(401).json({ error: 'Invalid credentials.' });

    if (staff.status === 'rejected')
      return res.status(403).json({ error: 'Your account has been deactivated. Contact the Division Office.' });

    if (staff.status === 'pending')
      return res.status(403).json({ error: 'Your account is pending approval by the Division Office.' });

    const token = signToken({
      role: 'staff',
      id: staff.id,
      name: staff.first_name + ' ' + staff.last_name,
      email: staff.email,
      position: staff.position,
      schoolId: staff.school_id,
      schoolName: staff.school_name || '',
      schoolLevel: staff.school_level || '',
      schoolCode: staff.school_code || '',
      division: staff.division || '',
    });
    if (!token)
      return res.status(500).json({ error: 'Server configuration error.' });

    console.log(`[LOGIN] Staff ${staff.email} (school ${staff.school_id || 'unassigned'}) at ${new Date().toISOString()}`);

    res.json({
      token,
      user: {
        role: 'staff',
        id: staff.id,
        name: staff.first_name + ' ' + staff.last_name,
        email: staff.email,
        position: staff.position,
        schoolId: staff.school_id,
        schoolName: staff.school_name || '',
        schoolLevel: staff.school_level || '',
        schoolCode: staff.school_code || '',
        division: staff.division || '',
      },
    });
  } catch (err) {
    console.error('[staff/login]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   POST /api/auth/staff/register
───────────────────────────────────────────── */
router.post('/staff/register', async (req, res) => {
  const firstName = sanitize(req.body.firstName || '');
  const lastName = sanitize(req.body.lastName || '');
  const position = sanitize(req.body.position || '');
  const email = sanitize(req.body.email || '').toLowerCase();
  const password = req.body.password;

  // schoolId is now optional — admin assigns schools after approval
  const schoolId = req.body.schoolId ? sanitize(String(req.body.schoolId)) : null;

  if (!firstName || !lastName || !position || !email || !password)
    return res.status(400).json({ error: 'All fields are required.' });

  if (!isValidEmail(email))
    return res.status(400).json({ error: 'Invalid email format.' });

  if (typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  if (password.length > 128)
    return res.status(400).json({ error: 'Password is too long.' });

  if (!/^[a-zA-ZÀ-ÿ0-9\s'\-\.,]+$/.test(firstName) || !/^[a-zA-ZÀ-ÿ0-9\s'\-\.,]+$/.test(lastName))
    return res.status(400).json({ error: 'Name contains invalid characters.' });

  try {
    // If schoolId is provided, validate it
    if (schoolId) {
      const schoolCheck = await pool.query('SELECT id FROM schools WHERE id=$1', [schoolId]);
      if (!schoolCheck.rows.length)
        return res.status(400).json({ error: 'Invalid school selected.' });
    }

    // Check for duplicate email globally to prevent login ambiguity since school dropdown was removed
    const exists = await pool.query('SELECT id FROM staff WHERE LOWER(email)=$1', [email]);
    if (exists.rows.length)
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO staff (school_id, first_name, last_name, position, email, password, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
      [schoolId, firstName, lastName, position, email, hash]
    );

    console.log(`[REGISTER] New staff ${email} (school: ${schoolId || 'unassigned'}) at ${new Date().toISOString()}`);
    res.status(201).json({ message: 'Account created. Awaiting Division Office approval.' });
  } catch (err) {
    console.error('[staff/register]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   POST /api/auth/admin/login
───────────────────────────────────────────── */
router.post('/admin/login', async (req, res) => {
  const username = sanitize(req.body.username || '').toLowerCase();
  const password = req.body.password;

  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required.' });

  if (username.length > 100 || typeof password !== 'string' || password.length > 128)
    return res.status(400).json({ error: 'Invalid input.' });

  try {
    const result = await pool.query(
      'SELECT id, username, full_name, division, password FROM admins WHERE LOWER(username)=$1 OR LOWER(email)=$1',
      [username]
    );
    const admin = result.rows[0];

    /*
     * FIX 2 — Removed the "emergency failsafe" debug block that:
     *   (a) ran 2 extra DB queries on every single login attempt, and
     *   (b) used UPDATE on a potentially empty table (does nothing), so
     *       the "reset" never actually worked anyway.
     * If you need to reset the admin password, run: node reset-admin.js
     */

    // Always run bcrypt to prevent timing attacks
    const hashToCompare = admin?.password || DUMMY_HASH;
    const match = await bcrypt.compare(password, hashToCompare);

    if (!admin || !match)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const token = signToken({
      role: 'admin',
      id: admin.id,
      name: admin.full_name,
      username: admin.username,
      division: admin.division,
    });
    if (!token)
      return res.status(500).json({ error: 'Server configuration error.' });

    console.log(`[LOGIN] Admin ${admin.username} at ${new Date().toISOString()}`);

    res.json({
      token,
      user: {
        role: 'admin',
        id: admin.id,
        name: admin.full_name,
        username: admin.username,
        division: admin.division,
      },
    });
  } catch (err) {
    console.error('[admin/login]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   GET /api/auth/me
───────────────────────────────────────────── */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/* ─────────────────────────────────────────────
   GET /api/auth/schools
───────────────────────────────────────────── */
router.get('/schools', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, school_code, level, division FROM schools ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[schools]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;