'use strict';
const pool = require('../db/pool');
const { sendMail, isMailConfigured } = require('./mail');

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function staffEmailsForSchool(schoolId) {
  const r = await pool.query(
    `SELECT DISTINCT email FROM staff
     WHERE school_id = $1 AND status = 'approved' AND email IS NOT NULL AND trim(email) <> ''`,
    [schoolId]
  );
  return r.rows.map((row) => row.email).filter(Boolean);
}

/**
 * Email all approved staff at a school when a submission is returned.
 */
async function notifyStaffSubmissionReturned({ ref, docType, feedback, schoolId, schoolName }) {
  if (!isMailConfigured()) return;
  const emails = await staffEmailsForSchool(schoolId);
  if (!emails.length) return;

  const subject = `[SMME] Submission ${ref} returned — action required`;
  const html = `
    <p>The Division Office has <strong>returned</strong> a submission for corrections.</p>
    <ul>
      <li><strong>School:</strong> ${escapeHtml(schoolName || 'Your school')}</li>
      <li><strong>Reference:</strong> ${escapeHtml(ref)}</li>
      <li><strong>Document type:</strong> ${escapeHtml(docType || '')}</li>
    </ul>
    <p><strong>Division feedback:</strong></p>
    <blockquote style="border-left:4px solid #f59e0b;padding-left:12px;margin:12px 0;">
      ${escapeHtml(feedback || '').replace(/\n/g, '<br/>')}
    </blockquote>
    <p>Please sign in to the <a href="${process.env.PUBLIC_APP_URL || ''}/html/school-dashboard.html">SMME Portal</a> to review the full thread, resubmit documents, or reply in the submission discussion.</p>
    <p style="color:#64748b;font-size:12px">This is an automated message from the School Management Monitoring &amp; Evaluation portal.</p>
  `;

  for (const to of emails) {
    await sendMail({ to, subject, html });
  }
}

/**
 * Email staff when an urgent (warning-type) division notice is posted.
 */
async function notifyStaffUrgentNotice({ title, message, targetSchoolId, targetLevel }) {
  if (!isMailConfigured()) return;

  let q = `
    SELECT DISTINCT s.email
    FROM staff s
    JOIN schools sc ON sc.id = s.school_id
    WHERE s.status = 'approved' AND s.email IS NOT NULL AND trim(s.email) <> ''`;
  const params = [];
  let i = 1;
  if (targetSchoolId) {
    q += ` AND sc.id = $${i++}`;
    params.push(targetSchoolId);
  } else if (targetLevel && targetLevel !== 'all') {
    q += ` AND sc.level = $${i++}`;
    params.push(targetLevel);
  }

  const r = await pool.query(q, params);
  const emails = r.rows.map((row) => row.email).filter(Boolean);
  if (!emails.length) return;

  const subject = `[SMME] Urgent division notice: ${title}`;
  const html = `
    <p><strong>${escapeHtml(title)}</strong></p>
    <div style="white-space:pre-wrap;border-left:4px solid #f97316;padding-left:12px;margin:12px 0;">
      ${escapeHtml(message || '').replace(/\n/g, '<br/>')}
    </div>
    <p>Open the <a href="${process.env.PUBLIC_APP_URL || ''}/html/school-dashboard.html">SMME Portal</a> for details and deadlines.</p>
    <p style="color:#64748b;font-size:12px">Automated message — do not reply to this email.</p>
  `;

  for (const to of emails) {
    await sendMail({ to, subject, html });
  }
}

module.exports = {
  notifyStaffSubmissionReturned,
  notifyStaffUrgentNotice,
};
