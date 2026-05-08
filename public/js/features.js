/**
 * SMME Portal – Shared Feature Library
 * Handles: notifications, drafts, templates, deadlines, audit log,
 *          staff management, compliance checklist, export helpers
 */

/* ============================================================
   NOTIFICATION SYSTEM
   ============================================================ */
const NOTIF_KEY = 'smme_notifications';

function getNotifications(schoolValue) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}');
    return all[schoolValue] || [];
  } catch { return []; }
}

function saveNotifications(schoolValue, notifs) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}');
    all[schoolValue] = notifs;
    localStorage.setItem(NOTIF_KEY, JSON.stringify(all));
  } catch {}
}

function addNotification(schoolValue, { type = 'info', title, message, ref = null }) {
  const notifs = getNotifications(schoolValue);
  notifs.unshift({
    id: Date.now() + Math.random(),
    type, title, message, ref,
    read: false,
    createdAt: new Date().toISOString()
  });
  // Keep last 50
  if (notifs.length > 50) notifs.length = 50;
  saveNotifications(schoolValue, notifs);
}

function markNotifRead(schoolValue, id) {
  const notifs = getNotifications(schoolValue);
  const n = notifs.find(x => x.id === id);
  if (n) { n.read = true; saveNotifications(schoolValue, notifs); }
}

function markAllNotifsRead(schoolValue) {
  const notifs = getNotifications(schoolValue);
  notifs.forEach(n => n.read = true);
  saveNotifications(schoolValue, notifs);
}

function getUnreadCount(schoolValue) {
  return getNotifications(schoolValue).filter(n => !n.read).length;
}

/* ============================================================
   DRAFT SYSTEM
   ============================================================ */
const DRAFT_KEY = 'smme_draft';

function saveDraft(schoolValue, staffEmail, data) {
  const key = `${DRAFT_KEY}_${btoa(schoolValue + staffEmail).replace(/=/g,'')}`;
  localStorage.setItem(key, JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
}

function loadDraft(schoolValue, staffEmail) {
  try {
    const key = `${DRAFT_KEY}_${btoa(schoolValue + staffEmail).replace(/=/g,'')}`;
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch { return null; }
}

function clearDraft(schoolValue, staffEmail) {
  const key = `${DRAFT_KEY}_${btoa(schoolValue + staffEmail).replace(/=/g,'')}`;
  localStorage.removeItem(key);
}

/* ============================================================
   SUBMISSION TEMPLATES
   ============================================================ */
const TMPL_KEY = 'smme_templates';

function getTemplates(schoolValue) {
  try {
    const all = JSON.parse(localStorage.getItem(TMPL_KEY) || '{}');
    return all[schoolValue] || [];
  } catch { return []; }
}

function saveTemplate(schoolValue, tpl) {
  const all = JSON.parse(localStorage.getItem(TMPL_KEY) || '{}');
  const list = all[schoolValue] || [];
  list.push({ ...tpl, id: Date.now(), createdAt: new Date().toISOString() });
  all[schoolValue] = list;
  localStorage.setItem(TMPL_KEY, JSON.stringify(all));
}

function deleteTemplate(schoolValue, id) {
  const all = JSON.parse(localStorage.getItem(TMPL_KEY) || '{}');
  all[schoolValue] = (all[schoolValue] || []).filter(t => t.id !== id);
  localStorage.setItem(TMPL_KEY, JSON.stringify(all));
}

/* ============================================================
   DEADLINES
   ============================================================ */
const DEADLINE_KEY = 'smme_deadlines';

function getDeadlines() {
  try {
    return JSON.parse(localStorage.getItem(DEADLINE_KEY) || '[]');
  } catch { return []; }
}

function saveDeadlines(list) {
  localStorage.setItem(DEADLINE_KEY, JSON.stringify(list));
}

// Seed default deadlines if none exist
function seedDeadlines() {
  if (getDeadlines().length > 0) return;
  saveDeadlines([
    { id: 1, docType: 'Enrollment Report',       year: '2026-2027', deadline: '2026-06-15', level: 'all' },
    { id: 2, docType: 'Faculty Credentials',     year: '2026-2027', deadline: '2026-07-01', level: 'all' },
    { id: 3, docType: 'Compliance Requirements', year: '2026-2027', deadline: '2026-06-30', level: 'all' },
    { id: 4, docType: 'Financial Reports',       year: '2025-2026', deadline: '2026-05-31', level: 'all' },
  ]);
}

function getDaysUntil(dateStr) {
  const now  = new Date(); now.setHours(0,0,0,0);
  const due  = new Date(dateStr); due.setHours(0,0,0,0);
  return Math.ceil((due - now) / 86400000);
}

/* ============================================================
   AUDIT LOG
   ============================================================ */
const AUDIT_KEY = 'smme_audit';

function getAuditLog() {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); }
  catch { return []; }
}

function addAuditEntry(entry) {
  const log = getAuditLog();
  log.unshift({ ...entry, timestamp: new Date().toISOString(), id: Date.now() });
  if (log.length > 200) log.length = 200;
  localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
}

/* ============================================================
   STAFF MANAGEMENT (per school)
   ============================================================ */
const STAFF_KEY = 'smme_staff_accounts';

function getStaffForSchool(schoolValue) {
  try {
    const all = JSON.parse(localStorage.getItem(STAFF_KEY) || '[]');
    return all.filter(a => a.schoolValue === schoolValue);
  } catch { return []; }
}

function getAllStaff() {
  try { return JSON.parse(localStorage.getItem(STAFF_KEY) || '[]'); }
  catch { return []; }
}

function updateStaffStatus(email, schoolValue, status) {
  const all = getAllStaff();
  const s = all.find(a => a.email === email && a.schoolValue === schoolValue);
  if (s) { s.status = status; localStorage.setItem(STAFF_KEY, JSON.stringify(all)); }
}

/* ============================================================
   COMPLIANCE CHECKLIST
   ============================================================ */
const COMPLIANCE_DOCS = [
  'Enrollment Report',
  'Faculty Credentials',
  'Compliance Requirements',
  'Financial Reports',
  'Accreditation Documents',
  'Curriculum Documents',
];

function getComplianceStatus(schoolValue, year) {
  const subs = (() => {
    try {
      const key = 'smme_subs_' + btoa(schoolValue || 'default').replace(/=/g,'');
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
  })();

  return COMPLIANCE_DOCS.map(doc => {
    const match = subs.find(s => s.docType === doc && s.year === year);
    return {
      doc,
      status: match ? match.status : 'missing',
      ref: match ? match.ref : null,
      date: match ? match.date : null,
    };
  });
}

/* ============================================================
   EXPORT TO CSV
   ============================================================ */
function exportToCSV(rows, headers, filename) {
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const lines  = [headers.map(escape).join(',')];
  rows.forEach(r => lines.push(r.map(escape).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================
   PENDING STAFF APPROVALS (admin side)
   ============================================================ */
function getPendingStaff() {
  return getAllStaff().filter(a => !a.status || a.status === 'pending');
}

function getApprovedStaff() {
  return getAllStaff().filter(a => a.status === 'approved');
}

/* ============================================================
   RETURN COMMENTS (stored on submission)
   ============================================================ */
function getSchoolSubmissions(schoolValue) {
  try {
    const key = 'smme_subs_' + btoa(schoolValue || 'default').replace(/=/g,'');
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

function saveSchoolSubmissions(schoolValue, subs) {
  const key = 'smme_subs_' + btoa(schoolValue || 'default').replace(/=/g,'');
  localStorage.setItem(key, JSON.stringify(subs));
}

function setSubmissionFeedback(schoolValue, ref, feedback, newStatus) {
  const subs = getSchoolSubmissions(schoolValue);
  const s = subs.find(x => x.ref === ref);
  if (s) {
    s.status   = newStatus;
    s.feedback = feedback;
    s.reviewedAt = new Date().toISOString();
    saveSchoolSubmissions(schoolValue, subs);
    // Add notification for the school
    addNotification(schoolValue, {
      type:    newStatus === 'approved' ? 'success' : 'warning',
      title:   newStatus === 'approved' ? 'Submission Approved' : 'Submission Returned',
      message: newStatus === 'approved'
        ? `Your submission ${ref} has been approved by the Division Office.`
        : `Your submission ${ref} was returned. Feedback: ${feedback || 'Please check and resubmit.'}`,
      ref
    });
  }
}

/* ============================================================
   RE-SUBMISSION
   ============================================================ */
function resubmit(schoolValue, originalRef, newData) {
  const subs = getSchoolSubmissions(schoolValue);
  const orig = subs.find(s => s.ref === originalRef);
  if (!orig) return null;
  const newRef = 'SMME-' + new Date().getFullYear() + '-' + (Math.floor(Math.random() * 90000) + 10000);
  subs.unshift({
    ...orig,
    ...newData,
    ref: newRef,
    status: 'received',
    originalRef,
    isRevision: true,
    feedback: null,
    date: new Date().toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' }),
    submittedAt: new Date().toISOString()
  });
  saveSchoolSubmissions(schoolValue, subs);
  addAuditEntry({ action: 'resubmit', ref: newRef, originalRef, school: schoolValue });
  return newRef;
}
