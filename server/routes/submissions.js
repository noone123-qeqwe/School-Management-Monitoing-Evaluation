const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db/pool');
const { requireAuth, requireAdmin, requireStaff } = require('../middleware/auth');
const { notifyStaffSubmissionReturned } = require('../services/emailTriggers');

const router = express.Router();

/* ── File upload config ── */
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  },
});

const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];

function hasAllowedExtension(name) {
  const ext = path.extname(String(name || '')).toLowerCase();
  return ALLOWED_EXT.includes(ext);
}

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype) || hasAllowedExtension(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF, Word, and Excel files are allowed.'));
  },
});

function cleanupUploadedFiles(files) {
  if (!Array.isArray(files)) return;
  files.forEach((file) => {
    if (!file || !file.path) return;
    fs.unlink(file.path, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Failed to cleanup orphaned upload:', err.message);
      }
    });
  });
}

function sanitizeDownloadName(name) {
  return String(name || 'download')
    .replace(/[\r\n"]/g, '')
    .replace(/[^\w.\-()\s]/g, '_')
    .trim() || 'download';
}

/* ── Reference number generator ── */
function genRef() {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 90000) + 10000);
  return `SMME-${year}-${num}`;
}

/* ── Audit helper ── */
async function audit(client, { action, ref, schoolId, staffId, adminId, docType, remarks }) {
  await client.query(
    `INSERT INTO audit_log (action, ref, school_id, staff_id, admin_id, doc_type, remarks)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [action, ref || null, schoolId || null, staffId || null, adminId || null, docType || null, remarks || null]
  );
}

/* ── Notification helper ── */
async function notify(client, { schoolId, type, title, message, ref }) {
  await client.query(
    `INSERT INTO notifications (school_id, type, title, message, ref)
     VALUES ($1,$2,$3,$4,$5)`,
    [schoolId, type || 'info', title, message, ref || null]
  );
}

async function getValidationRules(client) {
  const result = await client.query(
    `SELECT code, label, severity, rule_config
     FROM validation_rules
     WHERE is_enabled=TRUE`
  );
  const map = {};
  for (const row of result.rows) map[row.code] = row;
  return map;
}

async function runSubmissionValidation(client, payload) {
  const issues = [];
  const rules = await getValidationRules(client);

  if (rules.subject_min_length) {
    const min = parseInt(rules.subject_min_length.rule_config?.min || 8, 10);
    if (String(payload.subject || '').trim().length < min) {
      issues.push({
        code: 'subject_min_length',
        severity: rules.subject_min_length.severity,
        message: `${rules.subject_min_length.label}: minimum ${min} characters.`,
      });
    }
  }

  if (rules.max_files_per_submission) {
    const max = parseInt(rules.max_files_per_submission.rule_config?.max || 10, 10);
    if ((payload.fileCount || 0) > max) {
      issues.push({
        code: 'max_files_per_submission',
        severity: rules.max_files_per_submission.severity,
        message: `${rules.max_files_per_submission.label}: maximum ${max} files allowed.`,
      });
    }
  }

  if (rules.duplicate_doc_year_recent) {
    const days = parseInt(rules.duplicate_doc_year_recent.rule_config?.days || 30, 10);
    const dup = await client.query(
      `SELECT ref, submitted_at
       FROM submissions
       WHERE school_id=$1
         AND doc_type=$2
         AND school_year=$3
         AND submitted_at >= NOW() - ($4::text || ' days')::interval
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [payload.schoolId, payload.docType, payload.schoolYear, days]
    );
    if (dup.rows.length) {
      issues.push({
        code: 'duplicate_doc_year_recent',
        severity: rules.duplicate_doc_year_recent.severity,
        message: `${rules.duplicate_doc_year_recent.label}: similar submission found (${dup.rows[0].ref}).`,
      });
    }
  }

  return issues;
}

router.post('/validate', requireStaff, async (req, res) => {
  const { docType, schoolYear, subject, fileCount = 0 } = req.body;
  if (!docType || !schoolYear || !subject) {
    return res.status(400).json({ error: 'Document type, school year, and subject are required.' });
  }
  const client = await pool.connect();
  try {
    const issues = await runSubmissionValidation(client, {
      schoolId: req.user.schoolId,
      docType,
      schoolYear,
      subject,
      fileCount: parseInt(fileCount, 10) || 0,
    });
    res.json({ issues });
  } catch (err) {
    res.status(500).json({ error: 'Validation check failed.' });
  } finally {
    client.release();
  }
});

/* ─────────────────────────────────────────────
   POST /api/submissions  – submit documents
───────────────────────────────────────────── */
router.post('/', requireStaff, upload.array('files', 10), async (req, res) => {
  const { docType, schoolYear, subject, remarks, originalRef } = req.body;
  if (!docType || !schoolYear || !subject) {
    cleanupUploadedFiles(req.files);
    return res.status(400).json({ error: 'Document type, school year, and subject are required.' });
  }
  if (!req.files || req.files.length === 0) {
    cleanupUploadedFiles(req.files);
    return res.status(400).json({ error: 'At least one file is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const issues = await runSubmissionValidation(client, {
      schoolId: req.user.schoolId,
      docType,
      schoolYear,
      subject,
      fileCount: req.files.length,
    });
    const blocking = issues.filter(i => i.severity === 'error');
    if (blocking.length) {
      await client.query('ROLLBACK');
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: blocking[0].message, issues });
    }

    // Ensure unique ref
    let ref;
    let attempts = 0;
    do {
      ref = genRef();
      const exists = await client.query('SELECT id FROM submissions WHERE ref=$1', [ref]);
      if (!exists.rows.length) break;
    } while (++attempts < 10);

    const isRevision = !!originalRef;

    const result = await client.query(
      `INSERT INTO submissions
         (ref, school_id, staff_id, doc_type, school_year, subject, remarks,
          file_count, status, original_ref, is_revision)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'received',$9,$10)
       RETURNING *`,
      [ref, req.user.schoolId, req.user.id, docType, schoolYear, subject,
        remarks || null, req.files.length, originalRef || null, isRevision]
    );
    const sub = result.rows[0];

    // Save file metadata
    for (const file of req.files) {
      await client.query(
        `INSERT INTO submission_files (submission_id, original_name, stored_name, mime_type, file_size)
         VALUES ($1,$2,$3,$4,$5)`,
        [sub.id, file.originalname, file.filename, file.mimetype, file.size]
      );
    }

    await audit(client, { action: isRevision ? 'resub' : 'submit', ref, schoolId: req.user.schoolId, staffId: req.user.id, docType });
    await client.query('COMMIT');

    res.status(201).json({ ref, submission: sub });
  } catch (err) {
    await client.query('ROLLBACK');
    cleanupUploadedFiles(req.files);
    console.error(err);
    res.status(500).json({ error: 'Failed to submit documents.' });
  } finally {
    client.release();
  }
});

/* ─────────────────────────────────────────────
   GET /api/submissions  – list (staff = own school, admin = all)
───────────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  const { status, search, level, schoolId: qSchoolId, page = 1, limit = 50 } = req.query;
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const offset = (parsedPage - 1) * parsedLimit;

  try {
    let where = [];
    let params = [];
    let i = 1;

    if (req.user.role === 'staff') {
      where.push(`s.school_id = $${i++}`);
      params.push(req.user.schoolId);
    } else if (qSchoolId) {
      where.push(`s.school_id = $${i++}`);
      params.push(qSchoolId);
    }

    if (status) { where.push(`s.status = $${i++}`); params.push(status); }

    if (search) {
      where.push(`(s.ref ILIKE $${i} OR s.doc_type ILIKE $${i} OR sc.name ILIKE $${i} OR st.first_name ILIKE $${i} OR st.last_name ILIKE $${i})`);
      params.push('%' + search + '%'); i++;
    }

    if (level) { where.push(`sc.level = $${i++}`); params.push(level); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const query = `
      SELECT s.*,
             sc.name  AS school_name, sc.level AS school_level, sc.school_code,
             st.first_name, st.last_name, st.position AS staff_position,
             st.email AS staff_email
      FROM submissions s
      JOIN schools sc ON sc.id = s.school_id
      LEFT JOIN staff st ON st.id = s.staff_id
      ${whereClause}
      ORDER BY s.submitted_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `;
    params.push(parsedLimit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   GET /api/submissions/:ref/comments — discussion thread
   POST /api/submissions/:ref/comments — admin or school staff note
   (Must be registered before GET /:ref.)
───────────────────────────────────────────── */
router.get('/:ref/comments', requireAuth, async (req, res) => {
  try {
    const subResult = await pool.query(
      'SELECT id, school_id FROM submissions WHERE ref=$1',
      [req.params.ref]
    );
    if (!subResult.rows.length) return res.status(404).json({ error: 'Submission not found.' });
    const sub = subResult.rows[0];
    if (req.user.role === 'staff' && sub.school_id !== req.user.schoolId)
      return res.status(403).json({ error: 'Access denied.' });

    const result = await pool.query(
      `SELECT c.id, c.author_role, c.body, c.created_at,
              CASE WHEN c.author_role = 'admin' THEN ad.full_name
                   ELSE trim(coalesce(st.first_name,'') || ' ' || coalesce(st.last_name,'')) END AS author_name
       FROM submission_comments c
       LEFT JOIN admins ad ON ad.id = c.author_admin_id
       LEFT JOIN staff st ON st.id = c.author_staff_id
       WHERE c.submission_id = $1
       ORDER BY c.created_at ASC`,
      [sub.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/:ref/comments', requireAuth, async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body || body.length > 4000)
    return res.status(400).json({ error: 'Comment is required (max 4000 characters).' });
  try {
    const subResult = await pool.query(
      'SELECT id, school_id FROM submissions WHERE ref=$1',
      [req.params.ref]
    );
    if (!subResult.rows.length) return res.status(404).json({ error: 'Submission not found.' });
    const sub = subResult.rows[0];

    let ins;
    if (req.user.role === 'staff') {
      if (sub.school_id !== req.user.schoolId)
        return res.status(403).json({ error: 'Access denied.' });
      ins = await pool.query(
        `INSERT INTO submission_comments (submission_id, author_role, author_staff_id, body)
         VALUES ($1,'staff',$2,$3) RETURNING id`,
        [sub.id, req.user.id, body]
      );
    } else if (req.user.role === 'admin') {
      ins = await pool.query(
        `INSERT INTO submission_comments (submission_id, author_role, author_admin_id, body)
         VALUES ($1,'admin',$2,$3) RETURNING id`,
        [sub.id, req.user.id, body]
      );
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const row = await pool.query(
      `SELECT c.id, c.author_role, c.body, c.created_at,
              CASE WHEN c.author_role = 'admin' THEN ad.full_name
                   ELSE trim(coalesce(st.first_name,'') || ' ' || coalesce(st.last_name,'')) END AS author_name
       FROM submission_comments c
       LEFT JOIN admins ad ON ad.id = c.author_admin_id
       LEFT JOIN staff st ON st.id = c.author_staff_id
       WHERE c.id = $1`,
      [ins.rows[0].id]
    );
    res.status(201).json(row.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   GET /api/submissions/:ref  – single submission
───────────────────────────────────────────── */
router.get('/:ref', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*,
              sc.name AS school_name, sc.level AS school_level,
              st.first_name, st.last_name, st.position AS staff_position
       FROM submissions s
       JOIN schools sc ON sc.id = s.school_id
       LEFT JOIN staff st ON st.id = s.staff_id
       WHERE s.ref = $1`,
      [req.params.ref]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Submission not found.' });

    const sub = result.rows[0];
    // Staff can only see their own school's submissions
    if (req.user.role === 'staff' && sub.school_id !== req.user.schoolId)
      return res.status(403).json({ error: 'Access denied.' });

    // Get files
    const files = await pool.query(
      'SELECT * FROM submission_files WHERE submission_id=$1',
      [sub.id]
    );
    sub.files = files.rows;

    res.json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   PATCH /api/submissions/:ref/review  – admin approve/return
───────────────────────────────────────────── */
router.patch('/:ref/review', requireAdmin, async (req, res) => {
  const { action, feedback } = req.body; // action: 'approve' | 'return'
  if (!['approve', 'return'].includes(action))
    return res.status(400).json({ error: 'Action must be "approve" or "return".' });
  if (action === 'return' && !feedback)
    return res.status(400).json({ error: 'Feedback is required when returning a submission.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const subResult = await client.query(
      'SELECT * FROM submissions WHERE ref=$1', [req.params.ref]
    );
    if (!subResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Submission not found.' });
    }
    const sub = subResult.rows[0];

    const newStatus = action === 'approve' ? 'approved' : 'returned';
    await client.query(
      `UPDATE submissions
       SET status=$1, feedback=$2, reviewed_by=$3, reviewed_at=NOW()
       WHERE ref=$4`,
      [newStatus, feedback || null, req.user.id, req.params.ref]
    );

    // Notify the school
    await notify(client, {
      schoolId: sub.school_id,
      type: action === 'approve' ? 'success' : 'warning',
      title: action === 'approve' ? 'Submission Approved' : 'Submission Returned',
      message: action === 'approve'
        ? `Your submission ${req.params.ref} has been approved by the Division Office.`
        : `Your submission ${req.params.ref} was returned. Feedback: ${feedback}`,
      ref: req.params.ref,
    });

    if (action === 'return' && feedback) {
      await client.query(
        `INSERT INTO submission_comments (submission_id, author_role, author_admin_id, body)
         VALUES ($1,'admin',$2,$3)`,
        [sub.id, req.user.id, feedback]
      );
    } else if (action === 'approve' && feedback && String(feedback).trim()) {
      await client.query(
        `INSERT INTO submission_comments (submission_id, author_role, author_admin_id, body)
         VALUES ($1,'admin',$2,$3)`,
        [sub.id, req.user.id, String(feedback).trim()]
      );
    }

    await audit(client, {
      action: action === 'approve' ? 'approve' : 'return',
      ref: req.params.ref,
      schoolId: sub.school_id,
      adminId: req.user.id,
      docType: sub.doc_type,
      remarks: feedback || null,
    });

    await client.query('COMMIT');

    if (action === 'return') {
      const sc = await pool.query('SELECT name FROM schools WHERE id=$1', [sub.school_id]);
      const schoolName = sc.rows[0]?.name;
      setImmediate(() => {
        notifyStaffSubmissionReturned({
          ref: req.params.ref,
          docType: sub.doc_type,
          feedback,
          schoolId: sub.school_id,
          schoolName,
        }).catch((e) => console.error('[email] submission returned:', e.message));
      });
    }

    res.json({ message: `Submission ${newStatus}.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
});

/* ─────────────────────────────────────────────
   GET /api/submissions/:ref/files/:fileId  – download file
───────────────────────────────────────────── */
router.get('/:ref/files/:fileId', requireAuth, async (req, res) => {
  if (isNaN(parseInt(req.params.fileId, 10))) {
    return res.status(400).json({ error: 'Invalid file ID.' });
  }

  try {
    const fileResult = await pool.query(
      `SELECT sf.*, s.school_id FROM submission_files sf
       JOIN submissions s ON s.id = sf.submission_id
       WHERE sf.id=$1 AND s.ref=$2`,
      [parseInt(req.params.fileId, 10), req.params.ref]
    );
    if (!fileResult.rows.length) return res.status(404).json({ error: 'File not found.' });
    const file = fileResult.rows[0];

    if (req.user.role === 'staff' && file.school_id !== req.user.schoolId)
      return res.status(403).json({ error: 'Access denied.' });

    const filePath = path.join(uploadDir, path.basename(file.stored_name));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on server.' });

    const safeFileName = sanitizeDownloadName(file.original_name);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.setHeader('Content-Type', file.mime_type);
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─────────────────────────────────────────────
   GET /api/submissions/:ref/download-all  – download all files as zip
───────────────────────────────────────────── */
router.get('/:ref/download-all', requireAuth, async (req, res) => {
  try {
    let archiver;
    try {
      archiver = require('archiver');
    } catch (e) {
      return res.status(501).json({ error: 'ZIP feature requires the "archiver" package. Please run: npm install archiver' });
    }

    const subResult = await pool.query(
      'SELECT id, school_id FROM submissions WHERE ref=$1',
      [req.params.ref]
    );
    if (!subResult.rows.length) return res.status(404).json({ error: 'Submission not found.' });
    const sub = subResult.rows[0];

    if (req.user.role === 'staff' && sub.school_id !== req.user.schoolId)
      return res.status(403).json({ error: 'Access denied.' });

    const filesResult = await pool.query('SELECT * FROM submission_files WHERE submission_id=$1', [sub.id]);
    if (!filesResult.rows.length) return res.status(404).json({ error: 'No files to download.' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.ref}_files.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);

    filesResult.rows.forEach(file => {
      const filePath = path.join(uploadDir, path.basename(file.stored_name));
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: sanitizeDownloadName(file.original_name) });
      }
    });

    archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
