const express = require('express');
const bcrypt  = require('bcryptjs');
const pool    = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/* ─────────────────────────────────────────────
   GET /api/admin/schools
───────────────────────────────────────────── */
router.get('/schools', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sc.*,
              COUNT(DISTINCT s.id)  AS submission_count,
              COUNT(DISTINCT st.id) AS staff_count
       FROM schools sc
       LEFT JOIN submissions s  ON s.school_id  = sc.id
       LEFT JOIN staff       st ON st.school_id = sc.id
       GROUP BY sc.id ORDER BY sc.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   GET /api/admin/stats
───────────────────────────────────────────── */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [total, pending, approved, returned, schools, staff] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM submissions'),
      pool.query("SELECT COUNT(*) FROM submissions WHERE status IN ('received','review')"),
      pool.query("SELECT COUNT(*) FROM submissions WHERE status='approved'"),
      pool.query("SELECT COUNT(*) FROM submissions WHERE status='returned'"),
      pool.query('SELECT COUNT(*) FROM schools'),
      pool.query("SELECT COUNT(*) FROM staff WHERE status='pending'"),
    ]);
    res.json({
      total:        parseInt(total.rows[0].count),
      pending:      parseInt(pending.rows[0].count),
      approved:     parseInt(approved.rows[0].count),
      returned:     parseInt(returned.rows[0].count),
      schools:      parseInt(schools.rows[0].count),
      staffPending: parseInt(staff.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   GET /api/admin/audit
───────────────────────────────────────────── */
router.get('/audit', requireAdmin, async (req, res) => {
  const { search, action, limit = 100 } = req.query;
  try {
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    let where = []; let params = []; let i = 1;
    if (action) { where.push(`al.action=$${i++}`); params.push(action); }
    if (search) {
      where.push(`(al.ref ILIKE $${i} OR sc.name ILIKE $${i} OR al.doc_type ILIKE $${i})`);
      params.push('%' + search + '%'); i++;
    }
    const wc = where.length ? 'WHERE ' + where.join(' AND ') : '';
    params.push(parsedLimit);
    const result = await pool.query(
      `SELECT al.*, sc.name AS school_name,
              st.first_name || ' ' || st.last_name AS staff_name,
              ad.full_name AS admin_name
       FROM audit_log al
       LEFT JOIN schools sc ON sc.id = al.school_id
       LEFT JOIN staff   st ON st.id = al.staff_id
       LEFT JOIN admins  ad ON ad.id = al.admin_id
       ${wc}
       ORDER BY al.created_at DESC LIMIT $${i}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   GET/POST/DELETE /api/admin/notices
───────────────────────────────────────────── */
router.get('/notices', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const result = await pool.query(
        `SELECT n.*, sc.name AS target_school_name,
                COALESCE(vs.view_count, 0) AS view_count
         FROM notices n
         LEFT JOIN schools sc ON sc.id = n.target_school_id
         LEFT JOIN (
           SELECT notice_id, COUNT(*)::int AS view_count
           FROM notice_views
           GROUP BY notice_id
         ) vs ON vs.notice_id = n.id
         ORDER BY n.created_at DESC`
      );
      return res.json(result.rows);
    }

    const result = await pool.query(
      `SELECT n.*
       FROM notices n
       JOIN schools sc ON sc.id = $1
       WHERE (
         n.target_school_id IS NULL
         OR n.target_school_id = $1
       )
       AND (
         n.target_level = 'all'
         OR n.target_level = sc.level
       )
       ORDER BY n.created_at DESC`,
      [req.user.schoolId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/notices', requireAdmin, async (req, res) => {
  const { type, title, message, targetLevel, targetSchoolId } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required.' });
  try {
    const normalizedLevel = targetLevel || 'all';
    const result = await pool.query(
      `INSERT INTO notices (type, title, message, target_level, target_school_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [type || 'info', title, message, normalizedLevel, targetSchoolId || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/notices/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM notices WHERE id=$1', [req.params.id]);
    res.json({ message: 'Notice deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.get('/notices/:id/stats', requireAdmin, async (req, res) => {
  try {
    const noticeResult = await pool.query(
      'SELECT * FROM notices WHERE id=$1',
      [req.params.id]
    );
    if (!noticeResult.rows.length) return res.status(404).json({ error: 'Notice not found.' });
    const notice = noticeResult.rows[0];

    const audienceResult = await pool.query(
      `SELECT COUNT(*)::int AS audience
       FROM schools sc
       WHERE ($1::int IS NULL OR sc.id = $1)
         AND ($2 = 'all' OR sc.level = $2)`,
      [notice.target_school_id, notice.target_level]
    );

    const viewResult = await pool.query(
      `SELECT COUNT(DISTINCT school_id)::int AS viewed_schools
       FROM notice_views
       WHERE notice_id=$1`,
      [notice.id]
    );

    const audience = audienceResult.rows[0].audience || 0;
    const viewed = viewResult.rows[0].viewed_schools || 0;
    const viewRate = audience > 0 ? Math.round((viewed / audience) * 100) : 0;

    res.json({ audience, viewedSchools: viewed, viewRate });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/notices/:id/view', requireAuth, async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff access required.' });
  try {
    await pool.query(
      `INSERT INTO notice_views (notice_id, school_id, viewed_by)
       VALUES ($1,$2,$3)
       ON CONFLICT (notice_id, school_id, viewed_by) DO NOTHING`,
      [req.params.id, req.user.schoolId, req.user.id]
    );
    res.json({ message: 'Notice view tracked.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   GET/POST/DELETE /api/admin/deadlines
───────────────────────────────────────────── */
router.get('/deadlines', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM deadlines ORDER BY deadline ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/deadlines', requireAdmin, async (req, res) => {
  const { docType, schoolYear, deadline, level } = req.body;
  if (!docType || !deadline) return res.status(400).json({ error: 'Document type and deadline are required.' });
  try {
    const result = await pool.query(
      'INSERT INTO deadlines (doc_type, school_year, deadline, level, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [docType, schoolYear || '2026-2027', deadline, level || 'all', req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/deadlines/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM deadlines WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deadline deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

/* ─────────────────────────────────────────────
   Validation Rules Engine
───────────────────────────────────────────── */
router.get('/validation-rules', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM validation_rules
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/validation-rules', requireAdmin, async (req, res) => {
  const { code, label, severity = 'error', isEnabled = true, ruleConfig = {} } = req.body;
  if (!code || !label) return res.status(400).json({ error: 'Code and label are required.' });
  try {
    const result = await pool.query(
      `INSERT INTO validation_rules (code, label, severity, is_enabled, rule_config, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (code)
       DO UPDATE SET
         label = EXCLUDED.label,
         severity = EXCLUDED.severity,
         is_enabled = EXCLUDED.is_enabled,
         rule_config = EXCLUDED.rule_config,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING *`,
      [code, label, severity, !!isEnabled, ruleConfig, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   PATCH /api/admin/profile
───────────────────────────────────────────── */
router.patch('/profile', requireAdmin, async (req, res) => {
  const { fullName, position, email, phone } = req.body;
  try {
    await pool.query(
      'UPDATE admins SET full_name=$1, position=$2, email=$3, phone=$4 WHERE id=$5',
      [fullName, position, email, phone, req.user.id]
    );
    res.json({ message: 'Profile updated.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.patch('/password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Both passwords are required.' });
  try {
    const result = await pool.query('SELECT password FROM admins WHERE id=$1', [req.user.id]);
    const match  = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admins SET password=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Password updated.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
