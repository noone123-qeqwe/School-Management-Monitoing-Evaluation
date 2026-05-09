const express = require('express');
const bcrypt  = require('bcryptjs');
const pool    = require('../db/pool');
const { requireAdmin, requireStaff, requireAuth } = require('../middleware/auth');

const router = express.Router();

/* ─────────────────────────────────────────────
   GET /api/staff  – admin: all staff; staff: own school
───────────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      const { search, schoolId, status } = req.query;
      let where = []; let params = []; let i = 1;
      if (schoolId) { where.push(`s.school_id=$${i++}`); params.push(schoolId); }
      if (status)   { where.push(`s.status=$${i++}`);    params.push(status); }
      if (search)   {
        where.push(`(s.first_name ILIKE $${i} OR s.last_name ILIKE $${i} OR s.email ILIKE $${i})`);
        params.push('%' + search + '%'); i++;
      }
      const wc = where.length ? 'WHERE ' + where.join(' AND ') : '';
      result = await pool.query(
        `SELECT s.id, s.first_name, s.last_name, s.position, s.email,
                s.status, s.phone, s.created_at,
                sc.name AS school_name, sc.school_code, sc.level
         FROM staff s JOIN schools sc ON sc.id=s.school_id
         ${wc} ORDER BY s.created_at DESC`,
        params
      );
    } else {
      result = await pool.query(
        `SELECT s.id, s.first_name, s.last_name, s.position, s.email,
                s.status, s.phone, s.created_at
         FROM staff s WHERE s.school_id=$1 ORDER BY s.first_name`,
        [req.user.schoolId]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   PATCH /api/staff/:id/status  – admin approve/reject
───────────────────────────────────────────── */
router.patch('/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ error: 'Status must be "approved" or "rejected".' });
  try {
    await pool.query('UPDATE staff SET status=$1 WHERE id=$2', [status, req.params.id]);
    res.json({ message: `Staff account ${status}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   PATCH /api/staff/me  – update own profile
───────────────────────────────────────────── */
router.patch('/me', requireStaff, async (req, res) => {
  const { firstName, lastName, position, phone } = req.body;
  try {
    await pool.query(
      `UPDATE staff SET first_name=$1, last_name=$2, position=$3, phone=$4 WHERE id=$5`,
      [firstName, lastName, position, phone || null, req.user.id]
    );
    res.json({ message: 'Profile updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   PATCH /api/staff/me/password  – change own password
───────────────────────────────────────────── */
router.patch('/me/password', requireStaff, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Both current and new password are required.' });
  if (newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  try {
    const result = await pool.query('SELECT password FROM staff WHERE id=$1', [req.user.id]);
    const match  = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE staff SET password=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Password updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   GET /api/staff/tasks-summary
───────────────────────────────────────────── */
router.get('/tasks-summary', requireStaff, async (req, res) => {
  try {
    const [deadlinesRes, subsRes] = await Promise.all([
      pool.query(
        `SELECT d.*
         FROM deadlines d
         JOIN schools sc ON sc.id=$1
         WHERE (d.level='all' OR d.level=sc.level)
         ORDER BY d.deadline ASC`,
        [req.user.schoolId]
      ),
      pool.query(
        `SELECT ref, doc_type, school_year, status, submitted_at
         FROM submissions
         WHERE school_id=$1
         ORDER BY submitted_at DESC`,
        [req.user.schoolId]
      ),
    ]);

    const submissions = subsRes.rows;
    const submissionMap = new Map();
    for (const s of submissions) {
      const key = `${s.doc_type}__${s.school_year}`;
      if (!submissionMap.has(key)) submissionMap.set(key, s);
    }

    const tasks = deadlinesRes.rows.slice(0, 20).map((d) => {
      const key = `${d.doc_type}__${d.school_year}`;
      const match = submissionMap.get(key);
      return {
        id: d.id,
        docType: d.doc_type,
        schoolYear: d.school_year,
        deadline: d.deadline,
        status: match ? match.status : 'missing',
        ref: match ? match.ref : null,
      };
    });

    const total = tasks.length;
    const complete = tasks.filter((t) => ['approved', 'review', 'received'].includes(t.status)).length;
    const returned = tasks.filter((t) => t.status === 'returned').length;
    const pending = tasks.filter((t) => t.status === 'missing').length;
    const progressPercent = total > 0 ? Math.round((complete / total) * 100) : 0;

    res.json({ tasks, progress: { total, complete, returned, pending, progressPercent } });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
