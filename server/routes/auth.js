const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/* ── helpers ── */
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
}

/* ─────────────────────────────────────────────
   POST /api/auth/staff/login
───────────────────────────────────────────── */
router.post('/staff/login', async (req, res) => {
  const { email, schoolId, password } = req.body;
  if (!email || !schoolId || !password)
    return res.status(400).json({ error: 'Email, school, and password are required.' });

  try {
    const result = await pool.query(
      `SELECT s.*, sc.name AS school_name, sc.level AS school_level,
              sc.school_code, sc.division
       FROM staff s
       JOIN schools sc ON sc.id = s.school_id
       WHERE s.email = $1 AND s.school_id = $2`,
      [email.toLowerCase(), schoolId]
    );

    const staff = result.rows[0];
    if (!staff) return res.status(401).json({ error: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, staff.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    if (staff.status === 'rejected')
      return res.status(403).json({ error: 'Your account has been deactivated. Contact the Division Office.' });

    if (staff.status === 'pending')
      return res.status(403).json({ error: 'Your account is pending approval by the Division Office.' });

    const token = signToken({
      role:        'staff',
      id:          staff.id,
      name:        staff.first_name + ' ' + staff.last_name,
      email:       staff.email,
      position:    staff.position,
      schoolId:    staff.school_id,
      schoolName:  staff.school_name,
      schoolLevel: staff.school_level,
      schoolCode:  staff.school_code,
      division:    staff.division,
    });

    res.json({
      token,
      user: {
        role:        'staff',
        id:          staff.id,
        name:        staff.first_name + ' ' + staff.last_name,
        email:       staff.email,
        position:    staff.position,
        schoolId:    staff.school_id,
        schoolName:  staff.school_name,
        schoolLevel: staff.school_level,
        schoolCode:  staff.school_code,
        division:    staff.division,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   POST /api/auth/staff/register
───────────────────────────────────────────── */
router.post('/staff/register', async (req, res) => {
  const { firstName, lastName, position, schoolId, email, password } = req.body;
  if (!firstName || !lastName || !position || !schoolId || !email || !password)
    return res.status(400).json({ error: 'All fields are required.' });

  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    const exists = await pool.query(
      'SELECT id FROM staff WHERE email=$1 AND school_id=$2',
      [email.toLowerCase(), schoolId]
    );
    if (exists.rows.length)
      return res.status(409).json({ error: 'An account with this email already exists for this school.' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO staff (school_id, first_name, last_name, position, email, password, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
      [schoolId, firstName, lastName, position, email.toLowerCase(), hash]
    );

    res.status(201).json({ message: 'Account created. Awaiting Division Office approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   POST /api/auth/admin/login
───────────────────────────────────────────── */
router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required.' });

  try {
    const result = await pool.query(
      'SELECT * FROM admins WHERE username=$1',
      [username]
    );
    const admin = result.rows[0];
    if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = signToken({
      role:     'admin',
      id:       admin.id,
      name:     admin.full_name,
      username: admin.username,
      division: admin.division,
    });

    res.json({
      token,
      user: {
        role:     'admin',
        id:       admin.id,
        name:     admin.full_name,
        username: admin.username,
        division: admin.division,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   GET /api/auth/me  – verify token & return user
───────────────────────────────────────────── */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/* ─────────────────────────────────────────────
   GET /api/auth/schools  – list schools for login dropdown
───────────────────────────────────────────── */
router.get('/schools', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, school_code, level, division FROM schools ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
