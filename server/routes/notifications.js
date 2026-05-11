const express = require('express');
const pool    = require('../db/pool');
const { requireStaff } = require('../middleware/auth');

const router = express.Router();

/* GET /api/notifications – staff's school notifications */
router.get('/', requireStaff, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE school_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.schoolId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

/* GET /api/notifications/unread-count */
router.get('/unread-count', requireStaff, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE school_id=$1 AND is_read=FALSE',
      [req.user.schoolId]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

/* PATCH /api/notifications/read-all — register before /:id/read */
router.patch('/read-all', requireStaff, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read=TRUE WHERE school_id=$1',
      [req.user.schoolId]
    );
    res.json({ message: 'All marked as read.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

/* PATCH /api/notifications/:id/read */
router.patch('/:id/read', requireStaff, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read=TRUE WHERE id=$1 AND school_id=$2',
      [req.params.id, req.user.schoolId]
    );
    res.json({ message: 'Marked as read.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
