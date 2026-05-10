/* ===== AUTH GUARD ===== */
// Verify token server-side on load — catches expired tokens that sessionStorage still holds.
let user = API.auth.getUser();
if (!user || user.role !== 'staff') { window.location.href = '/html/login.html'; }

(async () => {
  const verified = await API.auth.verifySession();
  if (!verified || verified.role !== 'staff') {
    window.location.href = '/html/login.html';
    return;
  }
  // Refresh in-memory user from verified server response
  user = verified;
})();

/* ===== POPULATE UI ===== */
if (user) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const val = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('sidebarStaffName', user.name);
  set('sidebarStaffPosition', user.position || 'Staff');
  set('sidebarSchoolCtxName', user.schoolName || 'School');
  set('topbarUserName', user.name);
  set('topbarUserPos', user.position || 'Staff');
  set('welcomeMsg', 'Welcome, ' + user.name + '!');
  set('welcomeSub', (user.position || 'Staff') + ' \u2013 ' + (user.schoolName || 'School'));
  set('submitSubtitle', 'Submitting on behalf of ' + (user.schoolName || 'your school'));
  set('bannerStaffName', user.name);
  set('bannerStaffPos', user.position || 'Staff');
  set('bannerSchoolName', user.schoolName || 'School');
  set('bannerSchoolLevel', API.levelLabel(user.schoolLevel));
  set('mySubsSubtitle', 'Documents submitted by you (' + user.name + ')');
  set('profileStaffName', user.name);
  set('profilePosition', user.position || 'Staff');
  set('profileEmail', user.email || '');
  set('profileSchoolName', user.schoolName || '');
  set('profileSchoolLevel', API.levelLabel(user.schoolLevel));
  const parts = user.name.split(' ');
  val('pfFirstName', parts[0] || '');
  val('pfLastName', parts.slice(1).join(' ') || '');
  val('pfEmail', user.email || '');
  val('pfSchool', user.schoolName || '');
  const sel = document.getElementById('pfPosition');
  if (sel) for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === user.position) { sel.selectedIndex = i; break; }
  }
}

/* ===== SIDEBAR TOGGLE ===== */
const sidebar = document.getElementById('sidebar');
const topbarMenu = document.getElementById('topbarMenu');
const sidebarClose = document.getElementById('sidebarClose');
topbarMenu.addEventListener('click', () => sidebar.classList.add('open'));
sidebarClose.addEventListener('click', () => sidebar.classList.remove('open'));

/* ===== PAGE NAVIGATION ===== */
function switchPage(pageId) {
  document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  const link = document.querySelector('.sidebar-link[data-page="' + pageId + '"]');
  if (page) page.classList.add('active');
  if (link) link.classList.add('active');
  const titles = {
    dashboard: 'Dashboard', submit: 'Submit Documents', submissions: 'School Submissions',
    mine: 'My Submissions', compliance: 'Compliance Checklist', deadlines: 'Submission Deadlines',
    track: 'Track Submission', profile: 'My Profile'
  };
  document.getElementById('topbarTitle').textContent = titles[pageId] || pageId;
  sidebar.classList.remove('open');
  window.scrollTo(0, 0);
  if (pageId === 'dashboard') loadDashboard();
  if (pageId === 'submissions') loadSubmissions('all');
  if (pageId === 'mine') loadSubmissions('mine');
  if (pageId === 'compliance') loadCompliance();
  if (pageId === 'deadlines') loadDeadlines();
}
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); switchPage(link.dataset.page); });
});

/* ===== FEEDBACK CELL ===== */
function feedbackCell(s) {
  if (!s.feedback) return '<span style="color:var(--text-muted);font-size:.75rem">\u2014</span>';
  return '<span class="pill pill-returned" title="' + API.escapeHtml(s.feedback) + '" style="cursor:help"><i class="fas fa-comment-alt"></i> View</span>';
}

/* ===== LOAD DASHBOARD ===== */
async function loadDashboard() {
  try {
    const subs = await API.submissions.list({ limit: 100 });
    document.getElementById('statTotal').textContent = subs.length;
    document.getElementById('statReview').textContent = subs.filter(s => s.status === 'review' || s.status === 'received').length;
    document.getElementById('statApproved').textContent = subs.filter(s => s.status === 'approved').length;
    document.getElementById('statMine').textContent = subs.filter(s => Number(s.staff_id) === Number(user.id)).length;
    renderRecentTable(subs.slice(0, 5));
    renderDeadlineAlerts();
    loadTasksSummary();
    loadDivisionNotices();
  } catch (err) { API.showToast('Failed to load dashboard: ' + err.message, 'error'); }
}

async function loadDivisionNotices() {
  const list = document.getElementById('schoolNoticesList');
  if (!list) return;
  try {
    const notices = await API.admin.getNotices();
    if (!notices.length) {
      list.innerHTML = '<p style="color:var(--text-muted);padding:12px">No division notices at the moment.</p>';
      return;
    }
    list.innerHTML = notices.slice(0, 6).map((n) => {
      const ic = n.type === 'info' ? 'fa-info-circle' : n.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle';
      return `<div class="notice-item notice-${n.type}" data-notice-id="${n.id}">
        <i class="fas ${ic}"></i>
        <div>
          <strong>${API.escapeHtml(n.title)}</strong>
          <p>${API.escapeHtml(n.message)}</p>
          <span class="notice-date">${new Date(n.created_at).toLocaleDateString('en-PH')}</span>
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-notice-id]').forEach((el) => {
      el.addEventListener('click', async () => {
        try { await API.admin.markNoticeViewed(el.dataset.noticeId); } catch { }
      });
    });
  } catch {
    list.innerHTML = '<p style="color:var(--text-muted);padding:12px">Failed to load notices.</p>';
  }
}

async function loadTasksSummary() {
  const list = document.getElementById('tasksList');
  const progressEl = document.getElementById('progressSummary');
  if (!list || !progressEl) return;
  try {
    const { tasks, progress } = await API.staff.tasksSummary();
    list.innerHTML = tasks.slice(0, 6).map((t) => {
      const days = API.getDaysUntil(t.deadline);
      const status = t.status === 'missing' ? 'Not Submitted' :
        t.status === 'returned' ? 'Returned' :
          t.status === 'approved' ? 'Approved' : 'In Progress';
      return `<div class="audit-item">
        <span class="audit-badge ${t.status === 'approved' ? 'approve' : t.status === 'returned' ? 'return' : 'submit'}">${API.escapeHtml(status)}</span>
        <div class="audit-text">
          <strong>${API.escapeHtml(t.docType)}</strong>
          <span style="display:block;font-size:.78rem;color:var(--text-muted)">
            SY ${API.escapeHtml(t.schoolYear)} | Due ${API.escapeHtml(t.deadline)} (${days < 0 ? 'Overdue' : days + ' day(s) left'})
          </span>
        </div>
      </div>`;
    }).join('') || '<p style="color:var(--text-muted);padding:12px">No tracked tasks.</p>';

    progressEl.innerHTML = `
      <div style="padding:8px 0 12px"><strong>${progress.progressPercent}% complete</strong></div>
      <div style="height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden">
        <div style="height:100%;width:${progress.progressPercent}%;background:var(--primary)"></div>
      </div>
      <div style="display:flex;gap:14px;margin-top:12px;font-size:.82rem;color:var(--text-muted)">
        <span>Done: ${progress.complete}</span>
        <span>Pending: ${progress.pending}</span>
        <span>Returned: ${progress.returned}</span>
      </div>
    `;
  } catch {
    list.innerHTML = '<p style="color:var(--text-muted);padding:12px">Unable to load tasks right now.</p>';
    progressEl.innerHTML = '';
  }
}

function renderRecentTable(subs) {
  const tbody = document.getElementById('recentSubmissionsBody');
  if (!tbody) return;
  tbody.innerHTML = subs.length ? subs.map(s => {
    const isMe = Number(s.staff_id) === Number(user.id);
    return '<tr' + (isMe ? ' class="my-row"' : '') + '>' +
      '<td><strong>' + API.escapeHtml(s.ref) + '</strong>' + (s.is_revision ? ' <span class="pill" style="background:#ede9fe;color:#5b21b6;font-size:.68rem">Rev</span>' : '') + '</td>' +
      '<td>' + API.escapeHtml(s.doc_type) + '</td>' +
      '<td>' + API.escapeHtml(s.school_year) + '</td>' +
      '<td><span class="staff-name-cell' + (isMe ? ' is-me' : '') + '">' + API.escapeHtml((s.first_name || '') + ' ' + (s.last_name || '')) + (isMe ? ' <em>(you)</em>' : '') + '</span></td>' +
      '<td>' + API.escapeHtml(new Date(s.submitted_at).toLocaleDateString('en-PH')) + '</td>' +
      '<td>' + API.statusPill(s.status) + '</td>' +
      '<td>' + feedbackCell(s) + '</td>' +
      '<td>' + (s.status === 'returned' && isMe
        ? '<button class="action-btn review" onclick="openResubmit(\'' + API.escapeHtml(s.ref) + '\')"><i class="fas fa-redo"></i> Resubmit</button>'
        : '<button class="action-btn view" onclick="prefillTrack(\'' + API.escapeHtml(s.ref) + '\')"><i class="fas fa-eye"></i> Track</button>') +
      '</td></tr>';
  }).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px">No submissions yet.</td></tr>';
}

/* ===== LOAD SUBMISSIONS ===== */
async function loadSubmissions(mode) {
  const search = document.getElementById(mode === 'mine' ? 'mineSearch' : 'submissionSearch').value.toLowerCase();
  const status = document.getElementById(mode === 'mine' ? 'mineFilter' : 'submissionFilter').value;
  try {
    const params = { limit: 200 };
    if (status) params.status = status;
    if (search) params.search = search;
    const subs = await API.submissions.list(params);
    const filtered = mode === 'mine' ? subs.filter(s => Number(s.staff_id) === Number(user.id)) : subs;
    const tbodyId = mode === 'mine' ? 'mineSubmissionsBody' : 'allSubmissionsBody';
    const cols = mode === 'mine' ? 8 : 10;
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = filtered.length ? filtered.map(s => {
      const isMe = Number(s.staff_id) === Number(user.id);
      const date = new Date(s.submitted_at).toLocaleDateString('en-PH');
      if (mode === 'mine') {
        return '<tr>' +
          '<td><strong>' + API.escapeHtml(s.ref) + '</strong>' + (s.is_revision ? ' <span class="pill" style="background:#ede9fe;color:#5b21b6;font-size:.68rem">Rev</span>' : '') + '</td>' +
          '<td>' + API.escapeHtml(s.doc_type) + '</td><td>' + API.escapeHtml(s.school_year) + '</td>' +
          '<td>' + date + '</td><td>' + (s.file_count || 0) + ' file(s)</td>' +
          '<td>' + API.statusPill(s.status) + '</td><td>' + feedbackCell(s) + '</td>' +
          '<td>' + (s.status === 'returned'
            ? '<button class="action-btn review" onclick="openResubmit(\'' + API.escapeHtml(s.ref) + '\')"><i class="fas fa-redo"></i> Resubmit</button>'
            : '<button class="action-btn view" onclick="prefillTrack(\'' + API.escapeHtml(s.ref) + '\')"><i class="fas fa-eye"></i> Track</button>') +
          '</td></tr>';
      }
      return '<tr' + (isMe ? ' class="my-row"' : '') + '>' +
        '<td><strong>' + API.escapeHtml(s.ref) + '</strong>' + (s.is_revision ? ' <span class="pill" style="background:#ede9fe;color:#5b21b6;font-size:.68rem">Rev</span>' : '') + '</td>' +
        '<td>' + API.escapeHtml(s.doc_type) + '</td><td>' + API.escapeHtml(s.school_year) + '</td>' +
        '<td><span class="staff-name-cell' + (isMe ? ' is-me' : '') + '">' + API.escapeHtml((s.first_name || '') + ' ' + (s.last_name || '')) + (isMe ? ' <em>(you)</em>' : '') + '</span></td>' +
        '<td><span style="font-size:.78rem;color:var(--text-muted)">' + API.escapeHtml(s.staff_position || '') + '</span></td>' +
        '<td>' + date + '</td><td>' + (s.file_count || 0) + ' file(s)</td>' +
        '<td>' + API.statusPill(s.status) + '</td><td>' + feedbackCell(s) + '</td>' +
        '<td>' + (s.status === 'returned' && isMe
          ? '<button class="action-btn review" onclick="openResubmit(\'' + API.escapeHtml(s.ref) + '\')"><i class="fas fa-redo"></i> Resubmit</button>'
          : '<button class="action-btn view" onclick="prefillTrack(\'' + API.escapeHtml(s.ref) + '\')"><i class="fas fa-eye"></i> Track</button>') +
        '</td></tr>';
    }).join('') : '<tr><td colspan="' + cols + '" style="text-align:center;color:var(--text-muted);padding:32px">No submissions found.</td></tr>';
  } catch (err) { API.showToast('Failed to load submissions: ' + err.message, 'error'); }
}

document.getElementById('submissionSearch').addEventListener('input', () => loadSubmissions('all'));
document.getElementById('submissionFilter').addEventListener('change', () => loadSubmissions('all'));
document.getElementById('mineSearch').addEventListener('input', () => loadSubmissions('mine'));
document.getElementById('mineFilter').addEventListener('change', () => loadSubmissions('mine'));

/* ===== EXPORT CSV ===== */
document.getElementById('exportSubsBtn').addEventListener('click', async () => {
  try {
    const subs = await API.submissions.list({ limit: 1000 });
    API.exportToCSV(
      subs.map(s => [s.ref, s.doc_type, s.school_year, (s.first_name || '') + ' ' + (s.last_name || ''), s.staff_position || '', new Date(s.submitted_at).toLocaleDateString('en-PH'), s.file_count || 0, s.status, s.feedback || '']),
      ['Reference', 'Document Type', 'School Year', 'Submitted By', 'Position', 'Date', 'Files', 'Status', 'Feedback'],
      'submissions.csv'
    );
  } catch (err) { API.showToast('Export failed: ' + err.message, 'error'); }
});

/* ===== NOTIFICATIONS ===== */
async function refreshNotifBell() {
  try {
    const { count } = await API.notifications.unreadCount();
    const dot = document.getElementById('notifDot');
    const cnt = document.getElementById('notifCount');
    if (count > 0) {
      dot.removeAttribute('hidden'); cnt.removeAttribute('hidden');
      cnt.textContent = count > 9 ? '9+' : count;
    } else {
      dot.setAttribute('hidden', ''); cnt.setAttribute('hidden', '');
    }
  } catch { }
}

async function renderNotifPanel() {
  const list = document.getElementById('notifList');
  try {
    const notifs = await API.notifications.list();
    if (!notifs.length) {
      list.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash" style="font-size:1.5rem;margin-bottom:8px;display:block"></i>No notifications yet.</div>';
      return;
    }
    const iconMap = { success: 'fa-check-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    list.innerHTML = notifs.map(n =>
      '<div class="notif-item' + (n.is_read ? '' : ' unread') + '" data-id="' + n.id + '" data-ref="' + (n.ref || '') + '">' +
      '<div class="notif-icon ' + (n.type || 'info') + '"><i class="fas ' + (iconMap[n.type] || 'fa-info-circle') + '"></i></div>' +
      '<div class="notif-body"><strong>' + API.escapeHtml(n.title) + '</strong><p>' + API.escapeHtml(n.message) + '</p></div>' +
      '<span class="notif-time">' + API.timeAgo(n.created_at) + '</span></div>'
    ).join('');
    list.querySelectorAll('.notif-item').forEach(el => {
      el.addEventListener('click', async () => {
        await API.notifications.markRead(el.dataset.id);
        el.classList.remove('unread');
        refreshNotifBell();
        if (el.dataset.ref) { prefillTrack(el.dataset.ref); document.getElementById('notifPanel').setAttribute('hidden', ''); }
      });
    });
  } catch (err) {
    list.innerHTML = '<div class="notif-empty">Failed to load notifications.</div>';
  }
}

document.getElementById('notifBell').addEventListener('click', e => {
  e.stopPropagation();
  const panel = document.getElementById('notifPanel');
  if (panel.hasAttribute('hidden')) { renderNotifPanel(); panel.removeAttribute('hidden'); }
  else panel.setAttribute('hidden', '');
});

document.getElementById('markAllReadBtn').addEventListener('click', async () => {
  await API.notifications.markAllRead();
  renderNotifPanel(); refreshNotifBell();
});

document.addEventListener('click', e => {
  const panel = document.getElementById('notifPanel');
  if (!panel.hasAttribute('hidden') && !panel.contains(e.target) && e.target !== document.getElementById('notifBell'))
    panel.setAttribute('hidden', '');
});

/* ===== COMPLIANCE CHECKLIST ===== */
async function loadCompliance() {
  const year = document.getElementById('complianceYear').value;
  const grid = document.getElementById('complianceGrid');
  if (!grid) return;
  try {
    const [subs, deadlines] = await Promise.all([
      API.submissions.list({ limit: 500 }),
      API.admin.getDeadlines(),
    ]);
    const DOCS = ['Enrollment Report', 'Faculty Credentials', 'Compliance Requirements',
      'Financial Reports', 'Accreditation Documents', 'Curriculum Documents'];
    grid.innerHTML = DOCS.map(doc => {
      const match = subs.find(s => s.doc_type === doc && s.school_year === year);
      const status = match ? match.status : 'missing';
      const iconMap = { approved: 'done', review: 'review', returned: 'returned', received: 'review', missing: 'missing' };
      const ic = iconMap[status] || 'missing';
      const faMap = { done: 'fa-check', review: 'fa-hourglass-half', returned: 'fa-undo', missing: 'fa-times' };
      const labels = { approved: 'Submitted & Approved', review: 'Under Review', received: 'Received', returned: 'Returned – Needs Revision', missing: 'Not Yet Submitted' };
      return '<div class="compliance-card">' +
        '<div class="compliance-icon ' + ic + '"><i class="fas ' + (faMap[ic] || 'fa-times') + '"></i></div>' +
        '<div class="compliance-info"><strong>' + API.escapeHtml(doc) + '</strong>' +
        '<span class="comp-status ' + ic + '">' + (labels[status] || 'Missing') + '</span>' +
        (match ? '<span class="comp-ref">Ref: ' + API.escapeHtml(match.ref) + '</span>' : '') +
        (status === 'missing' || status === 'returned'
          ? '<button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="switchPage(\'submit\')"><i class="fas fa-upload"></i> ' + (status === 'returned' ? 'Resubmit' : 'Submit Now') + '</button>' : '') +
        '</div></div>';
    }).join('');
  } catch (err) { grid.innerHTML = '<p style="color:var(--text-muted)">Failed to load compliance data.</p>'; }
}
document.getElementById('complianceYear').addEventListener('change', loadCompliance);

/* ===== DEADLINES ===== */
async function loadDeadlines() {
  const list = document.getElementById('deadlinesList');
  if (!list) return;
  try {
    const deadlines = await API.admin.getDeadlines();
    if (!deadlines.length) { list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:32px">No deadlines set by the Division Office yet.</p>'; return; }
    list.innerHTML = deadlines.map(d => {
      const days = API.getDaysUntil(d.deadline);
      const numCls = days < 0 ? 'overdue' : days <= 3 ? 'urgent' : days <= 7 ? 'warning' : 'ok';
      const label = days < 0 ? 'Overdue' : days === 0 ? 'Today' : 'days left';
      return '<div class="deadline-card">' +
        '<div class="deadline-days"><span class="days-num ' + numCls + '">' + (days < 0 ? '!' : days) + '</span><span class="days-label">' + label + '</span></div>' +
        '<div class="deadline-info"><strong>' + API.escapeHtml(d.doc_type) + '</strong><span>School Year: ' + API.escapeHtml(d.school_year) + '</span></div>' +
        '<div class="deadline-date"><i class="fas fa-calendar-alt" style="margin-right:6px"></i>' + API.escapeHtml(d.deadline) + '</div>' +
        '<button class="btn btn-sm btn-primary" onclick="switchPage(\'submit\')"><i class="fas fa-upload"></i> Submit</button>' +
        '</div>';
    }).join('');
  } catch (err) { list.innerHTML = '<p style="color:var(--text-muted)">Failed to load deadlines.</p>'; }
}

async function renderDeadlineAlerts() {
  const container = document.getElementById('deadlineAlerts');
  if (!container) return;
  try {
    const deadlines = await API.admin.getDeadlines();
    const urgent = deadlines.filter(d => { const days = API.getDaysUntil(d.deadline); return days >= 0 && days <= 7; });
    container.innerHTML = urgent.map(d => {
      const days = API.getDaysUntil(d.deadline);
      return '<div class="deadline-alert ' + (days <= 3 ? 'urgent' : 'warning') + '">' +
        '<i class="fas fa-exclamation-circle"></i>' +
        '<strong>' + API.escapeHtml(d.doc_type) + '</strong> is due in <strong>' + days + ' day' + (days !== 1 ? 's' : '') + '</strong> (' + API.escapeHtml(d.deadline) + ').' +
        '<button class="btn btn-sm btn-primary" style="margin-left:auto" onclick="switchPage(\'submit\')">Submit Now</button></div>';
    }).join('');
  } catch { }
}
/* ===== FILE UPLOAD ===== */
let dFiles = [];
const dUploadArea = document.getElementById('dUploadArea');
const dFileInput = document.getElementById('dFileInput');
const dFileList = document.getElementById('dFileList');

document.getElementById('dBrowseBtn').addEventListener('click', () => dFileInput.click());
dFileInput.addEventListener('change', () => { addDFiles(Array.from(dFileInput.files)); dFileInput.value = ''; });
dUploadArea.addEventListener('dragover', e => { e.preventDefault(); dUploadArea.classList.add('drag-over'); });
dUploadArea.addEventListener('dragleave', () => dUploadArea.classList.remove('drag-over'));
dUploadArea.addEventListener('drop', e => {
  e.preventDefault(); dUploadArea.classList.remove('drag-over');
  addDFiles(Array.from(e.dataTransfer.files));
});

const ALLOWED = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];

function getFileExt(name) {
  const dot = String(name || '').lastIndexOf('.');
  return dot >= 0 ? String(name).slice(dot).toLowerCase() : '';
}

function isAllowedFile(file) {
  if (!file) return false;
  if (ALLOWED.includes(file.type)) return true;
  return ALLOWED_EXTENSIONS.includes(getFileExt(file.name));
}

function addDFiles(files) {
  files.forEach(f => {
    if (!isAllowedFile(f)) { API.showToast('"' + f.name + '" is not a supported file type.', 'error'); return; }
    if (f.size > MAX_FILE_SIZE) { API.showToast('"' + f.name + '" exceeds 100MB.', 'error'); return; }
    if (dFiles.find(x => x.name === f.name && x.size === f.size)) { API.showToast('"' + f.name + '" already added.', 'error'); return; }
    dFiles.push(f);
  });
  renderDFileList();
  runSmartValidationHints();
}

function renderDFileList() {
  dFileList.innerHTML = '';
  dFiles.forEach((f, i) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    const iconName = f.type === 'application/pdf' ? 'fa-file-pdf' : f.type.includes('word') ? 'fa-file-word' : 'fa-file-excel';
    const iconClass = f.type === 'application/pdf' ? 'pdf' : f.type.includes('word') ? 'word' : 'excel';
    li.innerHTML = '<i class="fas ' + iconName + ' file-icon ' + iconClass + '"></i>' +
      '<span class="file-name">' + API.escapeHtml(f.name) + '</span>' +
      '<span class="file-size">' + formatSize(f.size) + '</span>' +
      '<button class="file-remove" data-i="' + i + '"><i class="fas fa-times"></i></button>';
    dFileList.appendChild(li);
  });
  dFileList.querySelectorAll('.file-remove').forEach(btn => {
    btn.addEventListener('click', () => { dFiles.splice(parseInt(btn.dataset.i), 1); renderDFileList(); });
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/* ===== DRAFT (localStorage only — lightweight) ===== */
const DRAFT_KEY = 'smme_draft_' + (user ? user.id : '');

function saveDraftLocal() {
  const data = {
    docType: document.getElementById('dDocType').value,
    schoolYear: document.getElementById('dSchoolYear').value,
    subject: document.getElementById('dSubject').value,
    remarks: document.getElementById('dRemarks').value,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  API.showToast('Draft saved.', 'success');
  checkDraft();
}

function checkDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    const banner = document.getElementById('draftBanner');
    if (!draft) { banner.setAttribute('hidden', ''); return; }
    banner.removeAttribute('hidden');
    document.getElementById('draftDate').textContent =
      new Date(draft.savedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { }
}

document.getElementById('saveDraftBtn').addEventListener('click', saveDraftLocal);

document.getElementById('loadDraftBtn').addEventListener('click', () => {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!draft) return;
    document.getElementById('dDocType').value = draft.docType || '';
    document.getElementById('dSchoolYear').value = draft.schoolYear || '';
    document.getElementById('dSubject').value = draft.subject || '';
    document.getElementById('dRemarks').value = draft.remarks || '';
    document.getElementById('draftBanner').setAttribute('hidden', '');
    API.showToast('Draft loaded.', 'success');
  } catch { }
});

document.getElementById('discardDraftBtn').addEventListener('click', () => {
  localStorage.removeItem(DRAFT_KEY);
  document.getElementById('draftBanner').setAttribute('hidden', '');
  API.showToast('Draft discarded.');
});

/* ===== TEMPLATES (localStorage) ===== */
const TMPL_KEY = 'smme_templates_' + (user ? user.id : '');

function getTemplates() {
  try { return JSON.parse(localStorage.getItem(TMPL_KEY) || '[]'); } catch { return []; }
}

document.getElementById('saveTemplateBtn').addEventListener('click', () => {
  const docType = document.getElementById('dDocType').value;
  const schoolYear = document.getElementById('dSchoolYear').value;
  const subject = document.getElementById('dSubject').value;
  if (!docType) { API.showToast('Select a document type before saving a template.', 'error'); return; }
  const tmpls = getTemplates();
  tmpls.push({ id: Date.now(), name: docType + (schoolYear ? ' \u2013 ' + schoolYear : ''), docType, schoolYear, subject });
  localStorage.setItem(TMPL_KEY, JSON.stringify(tmpls));
  API.showToast('Template saved.', 'success');
});

document.getElementById('loadTemplateBtn').addEventListener('click', () => {
  const modal = document.getElementById('templateModal');
  const list = document.getElementById('templateList');
  const empty = document.getElementById('templateEmpty');
  const tmpls = getTemplates();
  if (!tmpls.length) { list.innerHTML = ''; empty.style.display = 'block'; }
  else {
    empty.style.display = 'none';
    list.innerHTML = tmpls.map((t, i) =>
      '<div class="template-item">' +
      '<div class="template-info"><strong>' + API.escapeHtml(t.name) + '</strong><span>' + API.escapeHtml(t.subject || '') + '</span></div>' +
      '<button class="action-btn view" onclick="applyTemplate(' + i + ')"><i class="fas fa-check"></i> Use</button>' +
      '<button class="action-btn return" onclick="removeTemplate(' + i + ')"><i class="fas fa-trash"></i></button>' +
      '</div>'
    ).join('');
  }
  modal.removeAttribute('hidden');
});

function applyTemplate(i) {
  const t = getTemplates()[i];
  if (!t) return;
  document.getElementById('dDocType').value = t.docType || '';
  document.getElementById('dSchoolYear').value = t.schoolYear || '';
  document.getElementById('dSubject').value = t.subject || '';
  document.getElementById('templateModal').setAttribute('hidden', '');
  API.showToast('Template applied.', 'success');
}

function removeTemplate(i) {
  const tmpls = getTemplates();
  tmpls.splice(i, 1);
  localStorage.setItem(TMPL_KEY, JSON.stringify(tmpls));
  document.getElementById('loadTemplateBtn').click();
}

document.getElementById('templateModalClose').addEventListener('click', () => {
  document.getElementById('templateModal').setAttribute('hidden', '');
});

/* ===== SUBMIT FORM ===== */
document.getElementById('dashSubmitForm').addEventListener('submit', async e => {
  e.preventDefault();
  let valid = true;

  [['dDocType', 'dDocTypeErr', 'Please select a document type.'],
  ['dSchoolYear', 'dSchoolYearErr', 'Please select a school year.'],
  ['dSubject', 'dSubjectErr', 'Subject is required.']].forEach(([id, errId, msg]) => {
    const el = document.getElementById(id), err = document.getElementById(errId);
    if (!el.value.trim()) { el.classList.add('invalid'); err.textContent = msg; valid = false; }
    else { el.classList.remove('invalid'); err.textContent = ''; }
  });

  const fileErr = document.getElementById('dFileErr');
  if (dFiles.length === 0) { fileErr.textContent = 'Please attach at least one file.'; valid = false; }
  else fileErr.textContent = '';
  if (!valid) return;

  const btn = document.getElementById('dSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  try {
    const form = new FormData();
    form.append('docType', document.getElementById('dDocType').value);
    form.append('schoolYear', document.getElementById('dSchoolYear').value);
    form.append('subject', document.getElementById('dSubject').value);
    form.append('remarks', document.getElementById('dRemarks').value);
    dFiles.forEach(f => form.append('files', f));

    const { ref } = await API.submissions.submit(form);

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit to Division Office';

    // Clear draft
    localStorage.removeItem(DRAFT_KEY);
    document.getElementById('draftBanner').setAttribute('hidden', '');

    document.getElementById('dashRefNumber').textContent = ref;
    document.getElementById('dashModalOverlay').removeAttribute('hidden');
    document.getElementById('dashSubmitForm').reset();
    dFiles = []; renderDFileList();
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit to Division Office';
    API.showToast('Submission failed: ' + err.message, 'error');
  }
});

let validateTimer = null;
async function runSmartValidationHints() {
  const hint = document.getElementById('smartFormHints');
  if (!hint) return;
  const docType = document.getElementById('dDocType').value;
  const schoolYear = document.getElementById('dSchoolYear').value;
  const subject = document.getElementById('dSubject').value;
  if (!docType || !schoolYear || !subject.trim()) {
    hint.textContent = '';
    return;
  }
  try {
    const { issues } = await API.submissions.validate({ docType, schoolYear, subject, fileCount: dFiles.length });
    if (!issues.length) {
      hint.innerHTML = '<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Looks good. No validation issues found.</span>';
      return;
    }
    hint.innerHTML = issues.map((i) =>
      `<div style="margin:2px 0;color:${i.severity === 'error' ? 'var(--danger)' : 'var(--warning)'}">
        <i class="fas ${i.severity === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        ${API.escapeHtml(i.message)}
      </div>`
    ).join('');
  } catch { }
}

['dDocType', 'dSchoolYear', 'dSubject'].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    clearTimeout(validateTimer);
    validateTimer = setTimeout(runSmartValidationHints, 350);
  });
  el.addEventListener('change', () => {
    clearTimeout(validateTimer);
    validateTimer = setTimeout(runSmartValidationHints, 350);
  });
});

document.getElementById('dashModalClose').addEventListener('click', () => {
  document.getElementById('dashModalOverlay').setAttribute('hidden', '');
  switchPage('mine');
});

/* ===== TRACK SUBMISSION ===== */
function prefillTrack(ref) {
  switchPage('track');
  document.getElementById('dTrackInput').value = ref;
  requestAnimationFrame(() => setTimeout(() => document.getElementById('dTrackBtn').click(), 150));
}

document.getElementById('dTrackBtn').addEventListener('click', async () => {
  const ref = document.getElementById('dTrackInput').value.trim().toUpperCase();
  const btn = document.getElementById('dTrackBtn');
  const result = document.getElementById('dTrackResult');
  if (!ref) { API.showToast('Please enter a reference number.', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';

  try {
    const s = await API.submissions.get(ref);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-search"></i> Track';

    const statusLabels = { review: 'Under Review', approved: 'Approved', returned: 'Returned', received: 'Received' };
    document.getElementById('dTrackRef').textContent = s.ref;
    document.getElementById('dTrackStatus').textContent = statusLabels[s.status] || s.status;
    document.getElementById('dTrackStatus').className = 'track-status status-' + s.status;
    document.getElementById('dTrackDetails').innerHTML =
      '<strong>' + API.escapeHtml(s.school_name || '') + '</strong><br/>' +
      'Document: ' + API.escapeHtml(s.doc_type) + ' &nbsp;|&nbsp; Year: ' + API.escapeHtml(s.school_year) + '<br/>' +
      'Submitted by: <strong>' + API.escapeHtml((s.first_name || '') + ' ' + (s.last_name || '')) + '</strong>' +
      ' (' + API.escapeHtml(s.staff_position || '') + ') &nbsp;|&nbsp; ' +
      new Date(s.submitted_at).toLocaleDateString('en-PH');

    const fbBox = document.getElementById('dTrackFeedback');
    if (s.feedback) {
      fbBox.removeAttribute('hidden');
      fbBox.innerHTML = '<strong><i class="fas fa-comment-alt"></i> Division Office Feedback:</strong> ' + API.escapeHtml(s.feedback);
    } else { fbBox.setAttribute('hidden', ''); }

    const steps = [
      { label: 'Submitted', done: true },
      { label: 'Received by Division Office', done: true },
      { label: 'Under Review', done: ['approved', 'returned'].includes(s.status), active: s.status === 'review' },
      {
        label: s.status === 'returned' ? 'Returned for Revision' : 'Approved / Processed',
        done: s.status === 'approved' || s.status === 'returned', pending: s.status === 'review'
      },
    ];
    document.getElementById('dTrackTimeline').innerHTML = steps.map(step => {
      const dc = step.done ? 'dot-done' : step.active ? 'dot-active' : 'dot-pending';
      const ic = step.done ? 'fa-check' : 'fa-circle';
      return '<div class="timeline-step"><div class="timeline-dot ' + dc + '"><i class="fas ' + ic + '"></i></div>' +
        '<div class="timeline-content"><strong>' + API.escapeHtml(step.label) + '</strong>' +
        '<span>' + (step.done ? new Date(s.submitted_at).toLocaleDateString('en-PH') : step.active ? 'In progress' : 'Pending') + '</span></div></div>';
    }).join('');
    result.removeAttribute('hidden');
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-search"></i> Track';
    API.showToast(err.message === 'Submission not found.' ? 'Reference number not found.' : err.message, 'error');
    result.setAttribute('hidden', '');
  }
});
document.getElementById('dTrackInput').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('dTrackBtn').click(); });

/* ===== RESUBMIT MODAL ===== */
let resubRef = null;
let resubFiles = [];

function openResubmit(ref) {
  resubRef = ref; resubFiles = [];
  document.getElementById('resubOrigRef').textContent = ref;
  document.getElementById('resubRemarks').value = '';
  document.getElementById('resubFileErr').textContent = '';
  renderResubFileList();
  // Load feedback
  API.submissions.get(ref).then(s => {
    const fb = document.getElementById('resubFeedback');
    if (s.feedback) { fb.removeAttribute('hidden'); fb.innerHTML = '<strong><i class="fas fa-comment-alt"></i> Admin Feedback:</strong> ' + API.escapeHtml(s.feedback); }
    else fb.setAttribute('hidden', '');
  }).catch(() => { });
  document.getElementById('resubmitModal').removeAttribute('hidden');
}

document.getElementById('resubBrowseBtn').addEventListener('click', () => document.getElementById('resubFileInput').click());
document.getElementById('resubFileInput').addEventListener('change', e => {
  addResubFiles(Array.from(e.target.files));
  renderResubFileList(); e.target.value = '';
});
document.getElementById('resubUploadArea').addEventListener('dragover', e => { e.preventDefault(); document.getElementById('resubUploadArea').classList.add('drag-over'); });
document.getElementById('resubUploadArea').addEventListener('dragleave', () => document.getElementById('resubUploadArea').classList.remove('drag-over'));
document.getElementById('resubUploadArea').addEventListener('drop', e => {
  e.preventDefault(); document.getElementById('resubUploadArea').classList.remove('drag-over');
  addResubFiles(Array.from(e.dataTransfer.files)); renderResubFileList();
});

function addResubFiles(files) {
  files.forEach(f => {
    if (!isAllowedFile(f)) { API.showToast('"' + f.name + '" is not a supported file type.', 'error'); return; }
    if (f.size > MAX_FILE_SIZE) { API.showToast('"' + f.name + '" exceeds 100MB.', 'error'); return; }
    if (resubFiles.find(x => x.name === f.name && x.size === f.size)) { API.showToast('"' + f.name + '" already added.', 'error'); return; }
    resubFiles.push(f);
  });
}

function renderResubFileList() {
  document.getElementById('resubFileList').innerHTML = resubFiles.map((f, i) =>
    '<li class="file-item"><i class="fas fa-file file-icon"></i>' +
    '<span class="file-name">' + API.escapeHtml(f.name) + '</span>' +
    '<span class="file-size">' + formatSize(f.size) + '</span>' +
    '<button class="file-remove" onclick="resubFiles.splice(' + i + ',1);renderResubFileList()"><i class="fas fa-times"></i></button></li>'
  ).join('');
}

document.getElementById('resubSubmitBtn').addEventListener('click', async () => {
  const fileErr = document.getElementById('resubFileErr');
  if (resubFiles.length === 0) { fileErr.textContent = 'Please attach at least one revised file.'; return; }
  fileErr.textContent = '';

  const btn = document.getElementById('resubSubmitBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  try {
    // Get original submission details to copy doc type / year
    const orig = await API.submissions.get(resubRef);
    const form = new FormData();
    form.append('docType', orig.doc_type);
    form.append('schoolYear', orig.school_year);
    form.append('subject', orig.subject || '');
    form.append('remarks', document.getElementById('resubRemarks').value);
    form.append('originalRef', resubRef);
    resubFiles.forEach(f => form.append('files', f));

    const { ref: newRef } = await API.submissions.submit(form);
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Resubmit';
    document.getElementById('resubmitModal').setAttribute('hidden', '');
    resubRef = null; resubFiles = [];
    API.showToast('Resubmitted successfully. New ref: ' + newRef, 'success');
    loadDashboard();
    loadSubmissions('mine');
    loadSubmissions('all');
  } catch (err) {
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Resubmit';
    API.showToast('Resubmit failed: ' + err.message, 'error');
  }
});

const closeResubmit = () => { document.getElementById('resubmitModal').setAttribute('hidden', ''); resubRef = null; resubFiles = []; };
document.getElementById('resubCancelBtn').addEventListener('click', closeResubmit);
document.getElementById('resubmitModalClose').addEventListener('click', closeResubmit);

document.getElementById('dashSubmitForm').addEventListener('reset', () => {
  dFiles = [];
  renderDFileList();
  const fileErr = document.getElementById('dFileErr');
  if (fileErr) fileErr.textContent = '';
});

/* ===== PROFILE FORMS ===== */
document.getElementById('profileForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await API.staff.updateProfile({
      firstName: document.getElementById('pfFirstName').value,
      lastName: document.getElementById('pfLastName').value,
      position: document.getElementById('pfPosition').value,
      phone: document.getElementById('pfPhone').value,
    });
    API.showToast('Profile updated successfully.', 'success');
  } catch (err) { API.showToast('Update failed: ' + err.message, 'error'); }
});

document.getElementById('changePasswordForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await API.staff.changePassword({
      currentPassword: document.getElementById('pfCurrentPw').value,
      newPassword: document.getElementById('pfNewPw').value,
    });
    API.showToast('Password updated successfully.', 'success');
    document.getElementById('changePasswordForm').reset();
  } catch (err) { API.showToast('Password update failed: ' + err.message, 'error'); }
});

/* ===== LOGOUT ===== */
document.getElementById('logoutBtn').addEventListener('click', () => API.auth.logout());

/* ===== INIT ===== */
loadDashboard();
loadSubmissions('all');
loadSubmissions('mine');
refreshNotifBell();
checkDraft();
// Poll notifications every 60s
setInterval(refreshNotifBell, 60000);/* ===== AUTH GUARD ===== */
// Verify token server-side on load — catches expired tokens that sessionStorage still holds.
let user = API.auth.getUser();
if (!user || user.role !== 'staff') { window.location.href = '/html/login.html'; }

(async () => {
  try {
    const verified = await API.auth.verifySession();
    if (!verified || verified.role !== 'staff') {
      window.location.href = '/html/login.html';
      return;
    }
    // Refresh in-memory user from verified server response
    user = verified;

    // Now that the user is verified, populate the UI and load data
    populateUI();
    initApp();
  } catch (err) {
    window.location.href = '/html/login.html';
  }
})();

/* ===== POPULATE UI ===== */
function populateUI() {
  if (!user) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const val = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('sidebarStaffName', user.name);
  set('sidebarStaffPosition', user.position || 'Staff');
  set('sidebarSchoolCtxName', user.schoolName || 'School');
  set('topbarUserName', user.name);
  set('topbarUserPos', user.position || 'Staff');
  set('welcomeMsg', 'Welcome, ' + user.name + '!');
  set('welcomeSub', (user.position || 'Staff') + ' \u2013 ' + (user.schoolName || 'School'));
  set('submitSubtitle', 'Submitting on behalf of ' + (user.schoolName || 'your school'));
  set('bannerStaffName', user.name);
  set('bannerStaffPos', user.position || 'Staff');
  set('bannerSchoolName', user.schoolName || 'School');
  set('bannerSchoolLevel', API.levelLabel(user.schoolLevel));
  set('mySubsSubtitle', 'Documents submitted by you (' + user.name + ')');
  set('profileStaffName', user.name);
  set('profilePosition', user.position || 'Staff');
  set('profileEmail', user.email || '');
  set('profileSchoolName', user.schoolName || '');
  set('profileSchoolLevel', API.levelLabel(user.schoolLevel));
  const parts = user.name.split(' ');
  val('pfFirstName', parts[0] || '');
  val('pfLastName', parts.slice(1).join(' ') || '');
  val('pfEmail', user.email || '');
  val('pfSchool', user.schoolName || '');
  const sel = document.getElementById('pfPosition');
  if (sel) for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === user.position) { sel.selectedIndex = i; break; }
  }
}

/* ===== SIDEBAR TOGGLE ===== */
const sidebar = document.getElementById('sidebar');
const topbarMenu = document.getElementById('topbarMenu');
const sidebarClose = document.getElementById('sidebarClose');
topbarMenu.addEventListener('click', () => sidebar.classList.add('open'));
sidebarClose.addEventListener('click', () => sidebar.classList.remove('open'));

/* ===== PAGE NAVIGATION ===== */
function switchPage(pageId) {
  document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  const link = document.querySelector('.sidebar-link[data-page="' + pageId + '"]');
  if (page) page.classList.add('active');
  if (link) link.classList.add('active');
  const titles = {
    dashboard: 'Dashboard', submit: 'Submit Documents', submissions: 'School Submissions',
    mine: 'My Submissions', compliance: 'Compliance Checklist', deadlines: 'Submission Deadlines',
    track: 'Track Submission', profile: 'My Profile'
  };
  document.getElementById('topbarTitle').textContent = titles[pageId] || pageId;
  sidebar.classList.remove('open');
  window.scrollTo(0, 0);
  if (pageId === 'dashboard') loadDashboard();
  if (pageId === 'submissions') loadSubmissions('all');
  if (pageId === 'mine') loadSubmissions('mine');
  if (pageId === 'compliance') loadCompliance();
  if (pageId === 'deadlines') loadDeadlines();
}
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); switchPage(link.dataset.page); });
});

/* ===== FEEDBACK CELL ===== */
function feedbackCell(s) {
  if (!s.feedback) return '<span style="color:var(--text-muted);font-size:.75rem">\u2014</span>';
  return '<span class="pill pill-returned" title="' + API.escapeHtml(s.feedback) + '" style="cursor:help"><i class="fas fa-comment-alt"></i> View</span>';
}

/* ===== LOAD DASHBOARD ===== */
async function loadDashboard() {
  try {
    const subs = await API.submissions.list({ limit: 100 });
    document.getElementById('statTotal').textContent = subs.length;
    document.getElementById('statReview').textContent = subs.filter(s => s.status === 'review' || s.status === 'received').length;
    document.getElementById('statApproved').textContent = subs.filter(s => s.status === 'approved').length;
    document.getElementById('statMine').textContent = subs.filter(s => Number(s.staff_id) === Number(user.id)).length;
    renderRecentTable(subs.slice(0, 5));
    renderDeadlineAlerts();
    loadTasksSummary();
    loadDivisionNotices();
  } catch (err) { API.showToast('Failed to load dashboard: ' + err.message, 'error'); }
}

async function loadDivisionNotices() {
  const list = document.getElementById('schoolNoticesList');
  if (!list) return;
  try {
    const notices = await API.admin.getNotices();
    if (!notices.length) {
      list.innerHTML = '<p style="color:var(--text-muted);padding:12px">No division notices at the moment.</p>';
      return;
    }
    list.innerHTML = notices.slice(0, 6).map((n) => {
      const ic = n.type === 'info' ? 'fa-info-circle' : n.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle';
      return `<div class="notice-item notice-${n.type}" data-notice-id="${n.id}">
        <i class="fas ${ic}"></i>
        <div>
          <strong>${API.escapeHtml(n.title)}</strong>
          <p>${API.escapeHtml(n.message)}</p>
          <span class="notice-date">${new Date(n.created_at).toLocaleDateString('en-PH')}</span>
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-notice-id]').forEach((el) => {
      el.addEventListener('click', async () => {
        try { await API.admin.markNoticeViewed(el.dataset.noticeId); } catch { }
      });
    });
  } catch {
    list.innerHTML = '<p style="color:var(--text-muted);padding:12px">Failed to load notices.</p>';
  }
}

async function loadTasksSummary() {
  const list = document.getElementById('tasksList');
  const progressEl = document.getElementById('progressSummary');
  if (!list || !progressEl) return;
  try {
    const { tasks, progress } = await API.staff.tasksSummary();
    list.innerHTML = tasks.slice(0, 6).map((t) => {
      const days = API.getDaysUntil(t.deadline);
      const status = t.status === 'missing' ? 'Not Submitted' :
        t.status === 'returned' ? 'Returned' :
          t.status === 'approved' ? 'Approved' : 'In Progress';
      return `<div class="audit-item">
        <span class="audit-badge ${t.status === 'approved' ? 'approve' : t.status === 'returned' ? 'return' : 'submit'}">${API.escapeHtml(status)}</span>
        <div class="audit-text">
          <strong>${API.escapeHtml(t.docType)}</strong>
          <span style="display:block;font-size:.78rem;color:var(--text-muted)">
            SY ${API.escapeHtml(t.schoolYear)} | Due ${API.escapeHtml(t.deadline)} (${days < 0 ? 'Overdue' : days + ' day(s) left'})
          </span>
        </div>
      </div>`;
    }).join('') || '<p style="color:var(--text-muted);padding:12px">No tracked tasks.</p>';

    progressEl.innerHTML = `
      <div style="padding:8px 0 12px"><strong>${progress.progressPercent}% complete</strong></div>
      <div style="height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden">
        <div style="height:100%;width:${progress.progressPercent}%;background:var(--primary)"></div>
      </div>
      <div style="display:flex;gap:14px;margin-top:12px;font-size:.82rem;color:var(--text-muted)">
        <span>Done: ${progress.complete}</span>
        <span>Pending: ${progress.pending}</span>
        <span>Returned: ${progress.returned}</span>
      </div>
    `;
  } catch {
    list.innerHTML = '<p style="color:var(--text-muted);padding:12px">Unable to load tasks right now.</p>';
    progressEl.innerHTML = '';
  }
}

function renderRecentTable(subs) {
  const tbody = document.getElementById('recentSubmissionsBody');
  if (!tbody) return;
  tbody.innerHTML = subs.length ? subs.map(s => {
    const isMe = Number(s.staff_id) === Number(user.id);
    return '<tr' + (isMe ? ' class="my-row"' : '') + '>' +
      '<td><strong>' + API.escapeHtml(s.ref) + '</strong>' + (s.is_revision ? ' <span class="pill" style="background:#ede9fe;color:#5b21b6;font-size:.68rem">Rev</span>' : '') + '</td>' +
      '<td>' + API.escapeHtml(s.doc_type) + '</td>' +
      '<td>' + API.escapeHtml(s.school_year) + '</td>' +
      '<td><span class="staff-name-cell' + (isMe ? ' is-me' : '') + '">' + API.escapeHtml((s.first_name || '') + ' ' + (s.last_name || '')) + (isMe ? ' <em>(you)</em>' : '') + '</span></td>' +
      '<td>' + API.escapeHtml(new Date(s.submitted_at).toLocaleDateString('en-PH')) + '</td>' +
      '<td>' + API.statusPill(s.status) + '</td>' +
      '<td>' + feedbackCell(s) + '</td>' +
      '<td>' + (s.status === 'returned' && isMe
        ? '<button class="action-btn review" onclick="openResubmit(\'' + API.escapeHtml(s.ref) + '\')"><i class="fas fa-redo"></i> Resubmit</button>'
        : '<button class="action-btn view" onclick="prefillTrack(\'' + API.escapeHtml(s.ref) + '\')"><i class="fas fa-eye"></i> Track</button>') +
      '</td></tr>';
  }).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px">No submissions yet.</td></tr>';
}

/* ===== LOAD SUBMISSIONS ===== */
async function loadSubmissions(mode) {
  const search = document.getElementById(mode === 'mine' ? 'mineSearch' : 'submissionSearch').value.toLowerCase();
  const status = document.getElementById(mode === 'mine' ? 'mineFilter' : 'submissionFilter').value;
  try {
    const params = { limit: 200 };
    if (status) params.status = status;
    if (search) params.search = search;
    const subs = await API.submissions.list(params);
    const filtered = mode === 'mine' ? subs.filter(s => Number(s.staff_id) === Number(user.id)) : subs;
    const tbodyId = mode === 'mine' ? 'mineSubmissionsBody' : 'allSubmissionsBody';
    const cols = mode === 'mine' ? 8 : 10;
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = filtered.length ? filtered.map(s => {
      const isMe = Number(s.staff_id) === Number(user.id);
      const date = new Date(s.submitted_at).toLocaleDateString('en-PH');
      if (mode === 'mine') {
        return '<tr>' +
          '<td><strong>' + API.escapeHtml(s.ref) + '</strong>' + (s.is_revision ? ' <span class="pill" style="background:#ede9fe;color:#5b21b6;font-size:.68rem">Rev</span>' : '') + '</td>' +
          '<td>' + API.escapeHtml(s.doc_type) + '</td><td>' + API.escapeHtml(s.school_year) + '</td>' +
          '<td>' + date + '</td><td>' + (s.file_count || 0) + ' file(s)</td>' +
          '<td>' + API.statusPill(s.status) + '</td><td>' + feedbackCell(s) + '</td>' +
          '<td>' + (s.status === 'returned'
            ? '<button class="action-btn review" onclick="openResubmit(\'' + API.escapeHtml(s.ref) + '\')"><i class="fas fa-redo"></i> Resubmit</button>'
            : '<button class="action-btn view" onclick="prefillTrack(\'' + API.escapeHtml(s.ref) + '\')"><i class="fas fa-eye"></i> Track</button>') +
          '</td></tr>';
      }
      return '<tr' + (isMe ? ' class="my-row"' : '') + '>' +
        '<td><strong>' + API.escapeHtml(s.ref) + '</strong>' + (s.is_revision ? ' <span class="pill" style="background:#ede9fe;color:#5b21b6;font-size:.68rem">Rev</span>' : '') + '</td>' +
        '<td>' + API.escapeHtml(s.doc_type) + '</td><td>' + API.escapeHtml(s.school_year) + '</td>' +
        '<td><span class="staff-name-cell' + (isMe ? ' is-me' : '') + '">' + API.escapeHtml((s.first_name || '') + ' ' + (s.last_name || '')) + (isMe ? ' <em>(you)</em>' : '') + '</span></td>' +
        '<td><span style="font-size:.78rem;color:var(--text-muted)">' + API.escapeHtml(s.staff_position || '') + '</span></td>' +
        '<td>' + date + '</td><td>' + (s.file_count || 0) + ' file(s)</td>' +
        '<td>' + API.statusPill(s.status) + '</td><td>' + feedbackCell(s) + '</td>' +
        '<td>' + (s.status === 'returned' && isMe
          ? '<button class="action-btn review" onclick="openResubmit(\'' + API.escapeHtml(s.ref) + '\')"><i class="fas fa-redo"></i> Resubmit</button>'
          : '<button class="action-btn view" onclick="prefillTrack(\'' + API.escapeHtml(s.ref) + '\')"><i class="fas fa-eye"></i> Track</button>') +
        '</td></tr>';
    }).join('') : '<tr><td colspan="' + cols + '" style="text-align:center;color:var(--text-muted);padding:32px">No submissions found.</td></tr>';
  } catch (err) { API.showToast('Failed to load submissions: ' + err.message, 'error'); }
}

document.getElementById('submissionSearch').addEventListener('input', () => loadSubmissions('all'));
document.getElementById('submissionFilter').addEventListener('change', () => loadSubmissions('all'));
document.getElementById('mineSearch').addEventListener('input', () => loadSubmissions('mine'));
document.getElementById('mineFilter').addEventListener('change', () => loadSubmissions('mine'));

/* ===== EXPORT CSV ===== */
document.getElementById('exportSubsBtn').addEventListener('click', async () => {
  try {
    const subs = await API.submissions.list({ limit: 1000 });
    API.exportToCSV(
      subs.map(s => [s.ref, s.doc_type, s.school_year, (s.first_name || '') + ' ' + (s.last_name || ''), s.staff_position || '', new Date(s.submitted_at).toLocaleDateString('en-PH'), s.file_count || 0, s.status, s.feedback || '']),
      ['Reference', 'Document Type', 'School Year', 'Submitted By', 'Position', 'Date', 'Files', 'Status', 'Feedback'],
      'submissions.csv'
    );
  } catch (err) { API.showToast('Export failed: ' + err.message, 'error'); }
});

/* ===== NOTIFICATIONS ===== */
async function refreshNotifBell() {
  try {
    const { count } = await API.notifications.unreadCount();
    const dot = document.getElementById('notifDot');
    const cnt = document.getElementById('notifCount');
    if (count > 0) {
      dot.removeAttribute('hidden'); cnt.removeAttribute('hidden');
      cnt.textContent = count > 9 ? '9+' : count;
    } else {
      dot.setAttribute('hidden', ''); cnt.setAttribute('hidden', '');
    }
  } catch { }
}

async function renderNotifPanel() {
  const list = document.getElementById('notifList');
  try {
    const notifs = await API.notifications.list();
    if (!notifs.length) {
      list.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash" style="font-size:1.5rem;margin-bottom:8px;display:block"></i>No notifications yet.</div>';
      return;
    }
    const iconMap = { success: 'fa-check-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    list.innerHTML = notifs.map(n =>
      '<div class="notif-item' + (n.is_read ? '' : ' unread') + '" data-id="' + n.id + '" data-ref="' + (n.ref || '') + '">' +
      '<div class="notif-icon ' + (n.type || 'info') + '"><i class="fas ' + (iconMap[n.type] || 'fa-info-circle') + '"></i></div>' +
      '<div class="notif-body"><strong>' + API.escapeHtml(n.title) + '</strong><p>' + API.escapeHtml(n.message) + '</p></div>' +
      '<span class="notif-time">' + API.timeAgo(n.created_at) + '</span></div>'
    ).join('');
    list.querySelectorAll('.notif-item').forEach(el => {
      el.addEventListener('click', async () => {
        await API.notifications.markRead(el.dataset.id);
        el.classList.remove('unread');
        refreshNotifBell();
        if (el.dataset.ref) { prefillTrack(el.dataset.ref); document.getElementById('notifPanel').setAttribute('hidden', ''); }
      });
    });
  } catch (err) {
    list.innerHTML = '<div class="notif-empty">Failed to load notifications.</div>';
  }
}

document.getElementById('notifBell').addEventListener('click', e => {
  e.stopPropagation();
  const panel = document.getElementById('notifPanel');
  if (panel.hasAttribute('hidden')) { renderNotifPanel(); panel.removeAttribute('hidden'); }
  else panel.setAttribute('hidden', '');
});

document.getElementById('markAllReadBtn').addEventListener('click', async () => {
  await API.notifications.markAllRead();
  renderNotifPanel(); refreshNotifBell();
});

document.addEventListener('click', e => {
  const panel = document.getElementById('notifPanel');
  if (!panel.hasAttribute('hidden') && !panel.contains(e.target) && e.target !== document.getElementById('notifBell'))
    panel.setAttribute('hidden', '');
});

/* ===== COMPLIANCE CHECKLIST ===== */
async function loadCompliance() {
  const year = document.getElementById('complianceYear').value;
  const grid = document.getElementById('complianceGrid');
  if (!grid) return;
  try {
    const [subs, deadlines] = await Promise.all([
      API.submissions.list({ limit: 500 }),
      API.admin.getDeadlines(),
    ]);
    const DOCS = ['Enrollment Report', 'Faculty Credentials', 'Compliance Requirements',
      'Financial Reports', 'Accreditation Documents', 'Curriculum Documents'];
    grid.innerHTML = DOCS.map(doc => {
      const match = subs.find(s => s.doc_type === doc && s.school_year === year);
      const status = match ? match.status : 'missing';
      const iconMap = { approved: 'done', review: 'review', returned: 'returned', received: 'review', missing: 'missing' };
      const ic = iconMap[status] || 'missing';
      const faMap = { done: 'fa-check', review: 'fa-hourglass-half', returned: 'fa-undo', missing: 'fa-times' };
      const labels = { approved: 'Submitted & Approved', review: 'Under Review', received: 'Received', returned: 'Returned – Needs Revision', missing: 'Not Yet Submitted' };
      return '<div class="compliance-card">' +
        '<div class="compliance-icon ' + ic + '"><i class="fas ' + (faMap[ic] || 'fa-times') + '"></i></div>' +
        '<div class="compliance-info"><strong>' + API.escapeHtml(doc) + '</strong>' +
        '<span class="comp-status ' + ic + '">' + (labels[status] || 'Missing') + '</span>' +
        (match ? '<span class="comp-ref">Ref: ' + API.escapeHtml(match.ref) + '</span>' : '') +
        (status === 'missing' || status === 'returned'
          ? '<button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="switchPage(\'submit\')"><i class="fas fa-upload"></i> ' + (status === 'returned' ? 'Resubmit' : 'Submit Now') + '</button>' : '') +
        '</div></div>';
    }).join('');
  } catch (err) { grid.innerHTML = '<p style="color:var(--text-muted)">Failed to load compliance data.</p>'; }
}
document.getElementById('complianceYear').addEventListener('change', loadCompliance);

/* ===== DEADLINES ===== */
async function loadDeadlines() {
  const list = document.getElementById('deadlinesList');
  if (!list) return;
  try {
    const deadlines = await API.admin.getDeadlines();
    if (!deadlines.length) { list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:32px">No deadlines set by the Division Office yet.</p>'; return; }
    list.innerHTML = deadlines.map(d => {
      const days = API.getDaysUntil(d.deadline);
      const numCls = days < 0 ? 'overdue' : days <= 3 ? 'urgent' : days <= 7 ? 'warning' : 'ok';
      const label = days < 0 ? 'Overdue' : days === 0 ? 'Today' : 'days left';
      return '<div class="deadline-card">' +
        '<div class="deadline-days"><span class="days-num ' + numCls + '">' + (days < 0 ? '!' : days) + '</span><span class="days-label">' + label + '</span></div>' +
        '<div class="deadline-info"><strong>' + API.escapeHtml(d.doc_type) + '</strong><span>School Year: ' + API.escapeHtml(d.school_year) + '</span></div>' +
        '<div class="deadline-date"><i class="fas fa-calendar-alt" style="margin-right:6px"></i>' + API.escapeHtml(d.deadline) + '</div>' +
        '<button class="btn btn-sm btn-primary" onclick="switchPage(\'submit\')"><i class="fas fa-upload"></i> Submit</button>' +
        '</div>';
    }).join('');
  } catch (err) { list.innerHTML = '<p style="color:var(--text-muted)">Failed to load deadlines.</p>'; }
}

async function renderDeadlineAlerts() {
  const container = document.getElementById('deadlineAlerts');
  if (!container) return;
  try {
    const deadlines = await API.admin.getDeadlines();
    const urgent = deadlines.filter(d => { const days = API.getDaysUntil(d.deadline); return days >= 0 && days <= 7; });
    container.innerHTML = urgent.map(d => {
      const days = API.getDaysUntil(d.deadline);
      return '<div class="deadline-alert ' + (days <= 3 ? 'urgent' : 'warning') + '">' +
        '<i class="fas fa-exclamation-circle"></i>' +
        '<strong>' + API.escapeHtml(d.doc_type) + '</strong> is due in <strong>' + days + ' day' + (days !== 1 ? 's' : '') + '</strong> (' + API.escapeHtml(d.deadline) + ').' +
        '<button class="btn btn-sm btn-primary" style="margin-left:auto" onclick="switchPage(\'submit\')">Submit Now</button></div>';
    }).join('');
  } catch { }
}
/* ===== FILE UPLOAD ===== */
let dFiles = [];
const dUploadArea = document.getElementById('dUploadArea');
const dFileInput = document.getElementById('dFileInput');
const dFileList = document.getElementById('dFileList');

document.getElementById('dBrowseBtn').addEventListener('click', () => dFileInput.click());
dFileInput.addEventListener('change', () => { addDFiles(Array.from(dFileInput.files)); dFileInput.value = ''; });
dUploadArea.addEventListener('dragover', e => { e.preventDefault(); dUploadArea.classList.add('drag-over'); });
dUploadArea.addEventListener('dragleave', () => dUploadArea.classList.remove('drag-over'));
dUploadArea.addEventListener('drop', e => {
  e.preventDefault(); dUploadArea.classList.remove('drag-over');
  addDFiles(Array.from(e.dataTransfer.files));
});

const ALLOWED = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];

function getFileExt(name) {
  const dot = String(name || '').lastIndexOf('.');
  return dot >= 0 ? String(name).slice(dot).toLowerCase() : '';
}

function isAllowedFile(file) {
  if (!file) return false;
  if (ALLOWED.includes(file.type)) return true;
  return ALLOWED_EXTENSIONS.includes(getFileExt(file.name));
}

function addDFiles(files) {
  files.forEach(f => {
    if (!isAllowedFile(f)) { API.showToast('"' + f.name + '" is not a supported file type.', 'error'); return; }
    if (f.size > MAX_FILE_SIZE) { API.showToast('"' + f.name + '" exceeds 100MB.', 'error'); return; }
    if (dFiles.find(x => x.name === f.name && x.size === f.size)) { API.showToast('"' + f.name + '" already added.', 'error'); return; }
    dFiles.push(f);
  });
  renderDFileList();
  runSmartValidationHints();
}

function renderDFileList() {
  dFileList.innerHTML = '';
  dFiles.forEach((f, i) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    const iconName = f.type === 'application/pdf' ? 'fa-file-pdf' : f.type.includes('word') ? 'fa-file-word' : 'fa-file-excel';
    const iconClass = f.type === 'application/pdf' ? 'pdf' : f.type.includes('word') ? 'word' : 'excel';
    li.innerHTML = '<i class="fas ' + iconName + ' file-icon ' + iconClass + '"></i>' +
      '<span class="file-name">' + API.escapeHtml(f.name) + '</span>' +
      '<span class="file-size">' + formatSize(f.size) + '</span>' +
      '<button class="file-remove" data-i="' + i + '"><i class="fas fa-times"></i></button>';
    dFileList.appendChild(li);
  });
  dFileList.querySelectorAll('.file-remove').forEach(btn => {
    btn.addEventListener('click', () => { dFiles.splice(parseInt(btn.dataset.i), 1); renderDFileList(); });
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/* ===== DRAFT (localStorage only — lightweight) ===== */
const DRAFT_KEY = 'smme_draft_' + (user ? user.id : '');

function saveDraftLocal() {
  const data = {
    docType: document.getElementById('dDocType').value,
    schoolYear: document.getElementById('dSchoolYear').value,
    subject: document.getElementById('dSubject').value,
    remarks: document.getElementById('dRemarks').value,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  API.showToast('Draft saved.', 'success');
  checkDraft();
}

function checkDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    const banner = document.getElementById('draftBanner');
    if (!draft) { banner.setAttribute('hidden', ''); return; }
    banner.removeAttribute('hidden');
    document.getElementById('draftDate').textContent =
      new Date(draft.savedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { }
}

document.getElementById('saveDraftBtn').addEventListener('click', saveDraftLocal);

document.getElementById('loadDraftBtn').addEventListener('click', () => {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!draft) return;
    document.getElementById('dDocType').value = draft.docType || '';
    document.getElementById('dSchoolYear').value = draft.schoolYear || '';
    document.getElementById('dSubject').value = draft.subject || '';
    document.getElementById('dRemarks').value = draft.remarks || '';
    document.getElementById('draftBanner').setAttribute('hidden', '');
    API.showToast('Draft loaded.', 'success');
  } catch { }
});

document.getElementById('discardDraftBtn').addEventListener('click', () => {
  localStorage.removeItem(DRAFT_KEY);
  document.getElementById('draftBanner').setAttribute('hidden', '');
  API.showToast('Draft discarded.');
});

/* ===== TEMPLATES (localStorage) ===== */
const TMPL_KEY = 'smme_templates_' + (user ? user.id : '');

function getTemplates() {
  try { return JSON.parse(localStorage.getItem(TMPL_KEY) || '[]'); } catch { return []; }
}

document.getElementById('saveTemplateBtn').addEventListener('click', () => {
  const docType = document.getElementById('dDocType').value;
  const schoolYear = document.getElementById('dSchoolYear').value;
  const subject = document.getElementById('dSubject').value;
  if (!docType) { API.showToast('Select a document type before saving a template.', 'error'); return; }
  const tmpls = getTemplates();
  tmpls.push({ id: Date.now(), name: docType + (schoolYear ? ' \u2013 ' + schoolYear : ''), docType, schoolYear, subject });
  localStorage.setItem(TMPL_KEY, JSON.stringify(tmpls));
  API.showToast('Template saved.', 'success');
});

document.getElementById('loadTemplateBtn').addEventListener('click', () => {
  const modal = document.getElementById('templateModal');
  const list = document.getElementById('templateList');
  const empty = document.getElementById('templateEmpty');
  const tmpls = getTemplates();
  if (!tmpls.length) { list.innerHTML = ''; empty.style.display = 'block'; }
  else {
    empty.style.display = 'none';
    list.innerHTML = tmpls.map((t, i) =>
      '<div class="template-item">' +
      '<div class="template-info"><strong>' + API.escapeHtml(t.name) + '</strong><span>' + API.escapeHtml(t.subject || '') + '</span></div>' +
      '<button class="action-btn view" onclick="applyTemplate(' + i + ')"><i class="fas fa-check"></i> Use</button>' +
      '<button class="action-btn return" onclick="removeTemplate(' + i + ')"><i class="fas fa-trash"></i></button>' +
      '</div>'
    ).join('');
  }
  modal.removeAttribute('hidden');
});

function applyTemplate(i) {
  const t = getTemplates()[i];
  if (!t) return;
  document.getElementById('dDocType').value = t.docType || '';
  document.getElementById('dSchoolYear').value = t.schoolYear || '';
  document.getElementById('dSubject').value = t.subject || '';
  document.getElementById('templateModal').setAttribute('hidden', '');
  API.showToast('Template applied.', 'success');
}

function removeTemplate(i) {
  const tmpls = getTemplates();
  tmpls.splice(i, 1);
  localStorage.setItem(TMPL_KEY, JSON.stringify(tmpls));
  document.getElementById('loadTemplateBtn').click();
}

document.getElementById('templateModalClose').addEventListener('click', () => {
  document.getElementById('templateModal').setAttribute('hidden', '');
});

/* ===== SUBMIT FORM ===== */
document.getElementById('dashSubmitForm').addEventListener('submit', async e => {
  e.preventDefault();
  let valid = true;

  [['dDocType', 'dDocTypeErr', 'Please select a document type.'],
  ['dSchoolYear', 'dSchoolYearErr', 'Please select a school year.'],
  ['dSubject', 'dSubjectErr', 'Subject is required.']].forEach(([id, errId, msg]) => {
    const el = document.getElementById(id), err = document.getElementById(errId);
    if (!el.value.trim()) { el.classList.add('invalid'); err.textContent = msg; valid = false; }
    else { el.classList.remove('invalid'); err.textContent = ''; }
  });

  const fileErr = document.getElementById('dFileErr');
  if (dFiles.length === 0) { fileErr.textContent = 'Please attach at least one file.'; valid = false; }
  else fileErr.textContent = '';
  if (!valid) return;

  const btn = document.getElementById('dSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  try {
    const form = new FormData();
    form.append('docType', document.getElementById('dDocType').value);
    form.append('schoolYear', document.getElementById('dSchoolYear').value);
    form.append('subject', document.getElementById('dSubject').value);
    form.append('remarks', document.getElementById('dRemarks').value);
    dFiles.forEach(f => form.append('files', f));

    const { ref } = await API.submissions.submit(form);

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit to Division Office';

    // Clear draft
    localStorage.removeItem(DRAFT_KEY);
    document.getElementById('draftBanner').setAttribute('hidden', '');

    document.getElementById('dashRefNumber').textContent = ref;
    document.getElementById('dashModalOverlay').removeAttribute('hidden');
    document.getElementById('dashSubmitForm').reset();
    dFiles = []; renderDFileList();
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit to Division Office';
    API.showToast('Submission failed: ' + err.message, 'error');
  }
});

let validateTimer = null;
async function runSmartValidationHints() {
  const hint = document.getElementById('smartFormHints');
  if (!hint) return;
  const docType = document.getElementById('dDocType').value;
  const schoolYear = document.getElementById('dSchoolYear').value;
  const subject = document.getElementById('dSubject').value;
  if (!docType || !schoolYear || !subject.trim()) {
    hint.textContent = '';
    return;
  }
  try {
    const { issues } = await API.submissions.validate({ docType, schoolYear, subject, fileCount: dFiles.length });
    if (!issues.length) {
      hint.innerHTML = '<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Looks good. No validation issues found.</span>';
      return;
    }
    hint.innerHTML = issues.map((i) =>
      `<div style="margin:2px 0;color:${i.severity === 'error' ? 'var(--danger)' : 'var(--warning)'}">
        <i class="fas ${i.severity === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        ${API.escapeHtml(i.message)}
      </div>`
    ).join('');
  } catch { }
}

['dDocType', 'dSchoolYear', 'dSubject'].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    clearTimeout(validateTimer);
    validateTimer = setTimeout(runSmartValidationHints, 350);
  });
  el.addEventListener('change', () => {
    clearTimeout(validateTimer);
    validateTimer = setTimeout(runSmartValidationHints, 350);
  });
});

document.getElementById('dashModalClose').addEventListener('click', () => {
  document.getElementById('dashModalOverlay').setAttribute('hidden', '');
  switchPage('mine');
});

/* ===== TRACK SUBMISSION ===== */
function prefillTrack(ref) {
  switchPage('track');
  document.getElementById('dTrackInput').value = ref;
  requestAnimationFrame(() => setTimeout(() => document.getElementById('dTrackBtn').click(), 150));
}

document.getElementById('dTrackBtn').addEventListener('click', async () => {
  const ref = document.getElementById('dTrackInput').value.trim().toUpperCase();
  const btn = document.getElementById('dTrackBtn');
  const result = document.getElementById('dTrackResult');
  if (!ref) { API.showToast('Please enter a reference number.', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';

  try {
    const s = await API.submissions.get(ref);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-search"></i> Track';

    const statusLabels = { review: 'Under Review', approved: 'Approved', returned: 'Returned', received: 'Received' };
    document.getElementById('dTrackRef').textContent = s.ref;
    document.getElementById('dTrackStatus').textContent = statusLabels[s.status] || s.status;
    document.getElementById('dTrackStatus').className = 'track-status status-' + s.status;
    document.getElementById('dTrackDetails').innerHTML =
      '<strong>' + API.escapeHtml(s.school_name || '') + '</strong><br/>' +
      'Document: ' + API.escapeHtml(s.doc_type) + ' &nbsp;|&nbsp; Year: ' + API.escapeHtml(s.school_year) + '<br/>' +
      'Submitted by: <strong>' + API.escapeHtml((s.first_name || '') + ' ' + (s.last_name || '')) + '</strong>' +
      ' (' + API.escapeHtml(s.staff_position || '') + ') &nbsp;|&nbsp; ' +
      new Date(s.submitted_at).toLocaleDateString('en-PH');

    const fbBox = document.getElementById('dTrackFeedback');
    if (s.feedback) {
      fbBox.removeAttribute('hidden');
      fbBox.innerHTML = '<strong><i class="fas fa-comment-alt"></i> Division Office Feedback:</strong> ' + API.escapeHtml(s.feedback);
    } else { fbBox.setAttribute('hidden', ''); }

    const steps = [
      { label: 'Submitted', done: true },
      { label: 'Received by Division Office', done: true },
      { label: 'Under Review', done: ['approved', 'returned'].includes(s.status), active: s.status === 'review' },
      {
        label: s.status === 'returned' ? 'Returned for Revision' : 'Approved / Processed',
        done: s.status === 'approved' || s.status === 'returned', pending: s.status === 'review'
      },
    ];
    document.getElementById('dTrackTimeline').innerHTML = steps.map(step => {
      const dc = step.done ? 'dot-done' : step.active ? 'dot-active' : 'dot-pending';
      const ic = step.done ? 'fa-check' : 'fa-circle';
      return '<div class="timeline-step"><div class="timeline-dot ' + dc + '"><i class="fas ' + ic + '"></i></div>' +
        '<div class="timeline-content"><strong>' + API.escapeHtml(step.label) + '</strong>' +
        '<span>' + (step.done ? new Date(s.submitted_at).toLocaleDateString('en-PH') : step.active ? 'In progress' : 'Pending') + '</span></div></div>';
    }).join('');
    result.removeAttribute('hidden');
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-search"></i> Track';
    API.showToast(err.message === 'Submission not found.' ? 'Reference number not found.' : err.message, 'error');
    result.setAttribute('hidden', '');
  }
});
document.getElementById('dTrackInput').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('dTrackBtn').click(); });

/* ===== RESUBMIT MODAL ===== */
let resubRef = null;
let resubFiles = [];

function openResubmit(ref) {
  resubRef = ref; resubFiles = [];
  document.getElementById('resubOrigRef').textContent = ref;
  document.getElementById('resubRemarks').value = '';
  document.getElementById('resubFileErr').textContent = '';
  renderResubFileList();
  // Load feedback
  API.submissions.get(ref).then(s => {
    const fb = document.getElementById('resubFeedback');
    if (s.feedback) { fb.removeAttribute('hidden'); fb.innerHTML = '<strong><i class="fas fa-comment-alt"></i> Admin Feedback:</strong> ' + API.escapeHtml(s.feedback); }
    else fb.setAttribute('hidden', '');
  }).catch(() => { });
  document.getElementById('resubmitModal').removeAttribute('hidden');
}

document.getElementById('resubBrowseBtn').addEventListener('click', () => document.getElementById('resubFileInput').click());
document.getElementById('resubFileInput').addEventListener('change', e => {
  addResubFiles(Array.from(e.target.files));
  renderResubFileList(); e.target.value = '';
});
document.getElementById('resubUploadArea').addEventListener('dragover', e => { e.preventDefault(); document.getElementById('resubUploadArea').classList.add('drag-over'); });
document.getElementById('resubUploadArea').addEventListener('dragleave', () => document.getElementById('resubUploadArea').classList.remove('drag-over'));
document.getElementById('resubUploadArea').addEventListener('drop', e => {
  e.preventDefault(); document.getElementById('resubUploadArea').classList.remove('drag-over');
  addResubFiles(Array.from(e.dataTransfer.files)); renderResubFileList();
});

function addResubFiles(files) {
  files.forEach(f => {
    if (!isAllowedFile(f)) { API.showToast('"' + f.name + '" is not a supported file type.', 'error'); return; }
    if (f.size > MAX_FILE_SIZE) { API.showToast('"' + f.name + '" exceeds 100MB.', 'error'); return; }
    if (resubFiles.find(x => x.name === f.name && x.size === f.size)) { API.showToast('"' + f.name + '" already added.', 'error'); return; }
    resubFiles.push(f);
  });
}

function renderResubFileList() {
  document.getElementById('resubFileList').innerHTML = resubFiles.map((f, i) =>
    '<li class="file-item"><i class="fas fa-file file-icon"></i>' +
    '<span class="file-name">' + API.escapeHtml(f.name) + '</span>' +
    '<span class="file-size">' + formatSize(f.size) + '</span>' +
    '<button class="file-remove" onclick="resubFiles.splice(' + i + ',1);renderResubFileList()"><i class="fas fa-times"></i></button></li>'
  ).join('');
}

document.getElementById('resubSubmitBtn').addEventListener('click', async () => {
  const fileErr = document.getElementById('resubFileErr');
  if (resubFiles.length === 0) { fileErr.textContent = 'Please attach at least one revised file.'; return; }
  fileErr.textContent = '';

  const btn = document.getElementById('resubSubmitBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  try {
    // Get original submission details to copy doc type / year
    const orig = await API.submissions.get(resubRef);
    const form = new FormData();
    form.append('docType', orig.doc_type);
    form.append('schoolYear', orig.school_year);
    form.append('subject', orig.subject || '');
    form.append('remarks', document.getElementById('resubRemarks').value);
    form.append('originalRef', resubRef);
    resubFiles.forEach(f => form.append('files', f));

    const { ref: newRef } = await API.submissions.submit(form);
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Resubmit';
    document.getElementById('resubmitModal').setAttribute('hidden', '');
    resubRef = null; resubFiles = [];
    API.showToast('Resubmitted successfully. New ref: ' + newRef, 'success');
    loadDashboard();
    loadSubmissions('mine');
    loadSubmissions('all');
  } catch (err) {
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Resubmit';
    API.showToast('Resubmit failed: ' + err.message, 'error');
  }
});

const closeResubmit = () => { document.getElementById('resubmitModal').setAttribute('hidden', ''); resubRef = null; resubFiles = []; };
document.getElementById('resubCancelBtn').addEventListener('click', closeResubmit);
document.getElementById('resubmitModalClose').addEventListener('click', closeResubmit);

document.getElementById('dashSubmitForm').addEventListener('reset', () => {
  dFiles = [];
  renderDFileList();
  const fileErr = document.getElementById('dFileErr');
  if (fileErr) fileErr.textContent = '';
});

/* ===== PROFILE FORMS ===== */
document.getElementById('profileForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await API.staff.updateProfile({
      firstName: document.getElementById('pfFirstName').value,
      lastName: document.getElementById('pfLastName').value,
      position: document.getElementById('pfPosition').value,
      phone: document.getElementById('pfPhone').value,
    });
    API.showToast('Profile updated successfully.', 'success');
  } catch (err) { API.showToast('Update failed: ' + err.message, 'error'); }
});

document.getElementById('changePasswordForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await API.staff.changePassword({
      currentPassword: document.getElementById('pfCurrentPw').value,
      newPassword: document.getElementById('pfNewPw').value,
    });
    API.showToast('Password updated successfully.', 'success');
    document.getElementById('changePasswordForm').reset();
  } catch (err) { API.showToast('Password update failed: ' + err.message, 'error'); }
});

/* ===== LOGOUT ===== */
document.getElementById('logoutBtn').addEventListener('click', () => API.auth.logout());

/* ===== INIT ===== */
function initApp() {
  loadDashboard();
  loadSubmissions('all');
  loadSubmissions('mine');
  refreshNotifBell();
  checkDraft();
  // Poll notifications every 60s
  setInterval(refreshNotifBell, 60000);
}