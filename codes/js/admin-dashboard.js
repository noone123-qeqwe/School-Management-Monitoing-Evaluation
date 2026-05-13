/* ===== AUTH GUARD ===== */
let user = API.auth.getUser();
if (!user || user.role !== 'admin') { window.location.href = '/html/login.html'; }

function populateAdminHeader() {
  if (!user) return;
  const set = (id, v) => { document.querySelectorAll('#' + id + ', .' + id).forEach(el => el.textContent = v); };
  set('sidebarAdminName', user.name);
  set('sidebarDivision', user.division || 'Masbate City SDO');
  set('sidebarLogoText', user.division || 'Division of Masbate');
  set('topbarAdminName', user.name);
  set('adminWelcome', `Welcome, ${user.name}`);
  set('adminDivisionLabel', user.division || 'Masbate City Schools Division Office (SDO)');
  set('settingsAdminName', user.name);
  set('settingsDivision', user.division || 'Masbate City SDO');
}

populateAdminHeader();
(async () => {
  const verified = await API.auth.verifySession();
  if (!verified || verified.role !== 'admin') {
    window.location.href = '/html/login.html';
    return;
  }
  user = verified;
  sessionStorage.setItem('smme_user', JSON.stringify(verified));
  populateAdminHeader();
})();

const currentDateEl = document.getElementById('currentDate');
if (currentDateEl) {
  currentDateEl.textContent =
    new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/* ===== SIDEBAR TOGGLE ===== */
const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay') || document.querySelector('.sidebar-overlay');

document.querySelectorAll('#topbarMenu, .topbar-menu').forEach(btn => {
  btn.addEventListener('click', () => {
    sidebar?.classList.add('open');
    sidebarOverlay?.classList.add('active');
  });
});

document.querySelectorAll('#sidebarClose, .sidebar-close').forEach(btn => {
  btn.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    sidebarOverlay?.classList.remove('active');
  });
});

sidebarOverlay?.addEventListener('click', () => {
  sidebar?.classList.remove('open');
  sidebarOverlay?.classList.remove('active');
});

/* ===== PAGE NAVIGATION ===== */
function switchPage(pageId) {
  document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

  const page = document.getElementById(`page-${pageId}`);
  const link = document.querySelector(`.sidebar-link[data-page="${pageId}"]`);

  if (page) page.classList.add('active');
  if (link) link.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', submissions: 'All Submissions', schools: 'Registered Schools',
    staff: 'Staff Accounts', deadlines: 'Submission Deadlines', reports: 'Reports & Analytics',
    audit: 'Audit Log', notices: 'Division Notices', validation: 'Validation Rules', settings: 'Settings'
  };

  document.getElementById('topbarTitle').textContent = titles[pageId] || pageId;
  if (sidebar) sidebar.classList.remove('open');
  if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  window.scrollTo(0, 0);

  if (pageId === 'dashboard') loadAdminDashboard();
  if (pageId === 'submissions') loadAllSubmissions();
  if (pageId === 'schools') loadSchools();
  if (pageId === 'staff') loadStaffPage();
  if (pageId === 'reports') loadReports();
  if (pageId === 'audit') loadAuditLog();
  if (pageId === 'deadlines') loadDeadlineMgmt();
  if (pageId === 'notices') loadNotices();
  if (pageId === 'validation') loadValidationRules();
}

document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); switchPage(link.dataset.page); });
});

/* ===== GLOBAL SEARCH & CLEAR ===== */
document.getElementById('globalSearch')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const v = e.target.value;
    switchPage('submissions');
    const search = document.getElementById('adminSearch');
    if (search) { search.value = v; search.dispatchEvent(new Event('input')); }
  }
});

document.querySelectorAll('.search-clear').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const input = e.target.closest('.search-bar')?.querySelector('.search-input');
    if (input) { input.value = ''; input.dispatchEvent(new Event('input')); }
  });
});

function renderEmpty(container, message) {
  if (!container) return;
  container.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:24px">${API.escapeHtml(message)}</p>`;
}

function renderError(container, message, retryJs) {
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center;padding:24px">
      <p style="color:var(--danger);margin-bottom:12px">${API.escapeHtml(message)}</p>
      <button class="btn btn-sm btn-outline" onclick="${retryJs}"><i class="fas fa-rotate-right"></i> Retry</button>
    </div>
  `;
}

let chartBySchoolInst = null;
let chartStatusInst = null;
let chartVolumeInst = null;

async function renderDashboardCharts() {
  if (typeof Chart === 'undefined') return;
  const barEl = document.getElementById('chartBySchool');
  const pieEl = document.getElementById('chartStatusPie');
  const lineEl = document.getElementById('chartVolumeLine');
  if (!barEl || !pieEl || !lineEl) return;
  try {
    const data = await API.admin.dashboardCharts();
    const rows = data.submissionsBySchool || [];
    const labels = rows.map((r) => r.school_name);
    const counts = rows.map((r) => r.cnt);
    if (chartBySchoolInst) chartBySchoolInst.destroy();
    chartBySchoolInst = new Chart(barEl, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['No submissions yet'],
        datasets: [{
          label: 'Submissions',
          data: labels.length ? counts : [0],

          backgroundColor: '#005ea2', /* Official Action Blue */
          borderRadius: 2,
          borderWidth: 1,
          borderColor: '#00457c'
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: 'Submissions per school (top 15)' } },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 40, autoSkip: true, maxTicksLimit: 12 } },
          y: { border: { dash: [4, 4] }, grid: { color: 'rgba(0,0,0,0.05)' } }
        },
      },
    });

    const sc = data.statusCounts || { approved: 0, pending: 0, returned: 0 };
    const total = (sc.approved + sc.pending + sc.returned) || 1;
    const setProg = (id, val) => {
      const pct = Math.round((val / total) * 100);
      const textEl = document.getElementById('v2Prog' + id + 'Text');
      const barEl = document.getElementById('v2Prog' + id + 'Bar');
      if (textEl) textEl.textContent = pct + '%';
      if (barEl) barEl.style.width = pct + '%';
    };
    setProg('Approved', sc.approved || 0);
    setProg('Review', sc.pending || 0);
    setProg('Returned', sc.returned || 0);

    if (chartStatusInst) chartStatusInst.destroy();
    chartStatusInst = new Chart(pieEl, {
      type: 'doughnut',
      data: {
        labels: ['Approved', 'Pending review', 'Returned'],
        datasets: [{
          data: [sc.approved || 0, sc.pending || 0, sc.returned || 0],
          backgroundColor: ['#00a91c', '#ffbe2e', '#d54309'], /* Accessible status colors */
          borderWidth: 2,
          borderColor: '#ffffff'
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { title: { display: true, text: 'Status distribution' } },
      },
    });

    const vol = data.volumeByWeek || [];
    const wLabels = vol.map((w) => {
      const d = new Date(w.week_start);
      return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    });
    const wCounts = vol.map((w) => w.cnt);
    if (chartVolumeInst) chartVolumeInst.destroy();
    chartVolumeInst = new Chart(lineEl, {
      type: 'line',
      data: {
        labels: wLabels.length ? wLabels : ['—'],
        datasets: [{
          label: 'Submissions / week',
          data: wLabels.length ? wCounts : [0],
          borderColor: '#112e51', /* Deep Navy */
          backgroundColor: 'rgba(17, 46, 81, 0.12)',
          fill: true,
          tension: 0.1, /* Straighter lines for a more formal aesthetic */
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { title: { display: true, text: 'Volume by week (last 8 weeks)' } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, border: { dash: [4, 4] }, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0 } }
        },
      },
    });
  } catch (err) {
    console.error('[charts]', err);
  }
}

async function loadReviewThread(ref) {
  const list = document.getElementById('reviewCommentsList');
  if (!list) return;
  try {
    const rows = await API.submissions.listComments(ref);
    list.innerHTML = rows.length
      ? rows.map((c) => `
        <div style="border-bottom:1px solid var(--border,#e2e8f0);padding:8px 0">
          <strong>${API.escapeHtml(c.author_name || c.author_role)}</strong>
          <span style="color:var(--text-muted);font-size:0.75rem;margin-left:6px">${new Date(c.created_at).toLocaleString('en-PH')}</span>
          <p style="margin:6px 0 0;white-space:pre-wrap">${API.escapeHtml(c.body)}</p>
        </div>
      `).join('')
      : '<p style="color:var(--text-muted);margin:0">No notes in the thread yet.</p>';
  } catch {
    list.innerHTML = '<p style="color:var(--danger)">Could not load discussion.</p>';
  }
}

/* ===== DASHBOARD ===== */
async function loadAdminDashboard() {
  API.ui.showSkeleton('pendingTableBody', 'table', 5);
  try {
    const [stats, subs] = await Promise.all([
      API.admin.stats(),
      API.submissions.list({ limit: 200 }),
    ]);

    document.getElementById('statTotalSubs').textContent = stats.total;
    document.getElementById('statPending').textContent = stats.pending;
    document.getElementById('statApproved').textContent = stats.approved;
    document.getElementById('statSchools').textContent = stats.schools;

    document.querySelectorAll('#pendingBadge, .pending-badge').forEach(badge => {
      if (stats.pending > 0) {
        badge.removeAttribute('hidden');
        badge.textContent = stats.pending;
      } else {
        badge.setAttribute('hidden', '');
        badge.textContent = '0';
      }
    });

    document.querySelectorAll('#staffPendingBadge, .staff-pending-badge').forEach(badge => {
      if (stats.staffPending > 0) {
        badge.removeAttribute('hidden');
        badge.textContent = stats.staffPending;
      } else {
        badge.setAttribute('hidden', '');
        badge.textContent = '0';
      }
    });

    // Pending table
    const pending = subs.filter(s => s.status === 'review' || s.status === 'received').slice(0, 6);
    const tbody = document.getElementById('pendingTableBody');

    tbody.innerHTML = pending.length ? pending.map(s => `
      <tr>
        <td><strong>${API.escapeHtml(s.ref)}</strong></td>
        <td>${API.escapeHtml(s.school_name || '')}</td>
        <td>${API.escapeHtml(s.doc_type)}</td>
        <td>${new Date(s.submitted_at).toLocaleDateString('en-PH')}</td>
        <td>
          <button class="action-btn review" onclick="openReview('${API.escapeHtml(s.ref)}')">
            <i class="fas fa-eye"></i> Review
          </button>
        </td>
      </tr>
    `).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">No pending submissions.</td></tr>`;

    // Activity
    renderActivity(subs.slice(0, 8));
    await renderDashboardCharts();
  } catch (err) {
    API.showToast(`Failed to load dashboard: ${err.message}`, 'error');
    renderError(document.getElementById('pendingTableBody')?.closest('.table-wrap'), 'Unable to load dashboard pending table.', 'loadAdminDashboard()');
    renderError(document.getElementById('activityList'), 'Unable to load recent activity.', 'loadAdminDashboard()');
  }
}

function renderActivity(subs) {
  const list = document.getElementById('activityList');
  if (!list) return;
  const colorMap = { approved: 'green', returned: 'red', received: 'blue', review: 'yellow' };

  list.innerHTML = subs.map((s, index) => {
    const color = colorMap[s.status] || 'blue';
    let text = '';

    if (s.status === 'approved') {
      text = `<strong>${API.escapeHtml(s.ref)}</strong> approved \u2013 ${API.escapeHtml(s.doc_type)} from ${API.escapeHtml(s.school_name || '')}`;
    } else if (s.status === 'returned') {
      text = `<strong>${API.escapeHtml(s.ref)}</strong> returned to ${API.escapeHtml(s.school_name || '')} \u2013 ${API.escapeHtml(s.doc_type)}`;
    } else {
      text = `<strong>${API.escapeHtml(s.ref)}</strong> submitted by ${API.escapeHtml(s.school_name || '')} \u2013 ${API.escapeHtml(s.doc_type)}`;
    }

    return `
      <div class="activity-item activity-feed-item" style="animation-delay: ${index * 0.1}s">
        <div class="activity-dot ${color}"></div>
        <div class="activity-text">${text}</div>
        <div class="activity-time">${API.timeAgo(s.submitted_at)}</div>
      </div>
    `;
  }).join('') || `<p style="color:var(--text-muted);padding:16px;text-align:center">No activity yet.</p>`;
}

/* ===== ALL SUBMISSIONS ===== */
let selectedRefs = [];

async function loadAllSubmissions() {
  const search = document.getElementById('adminSearch').value.toLowerCase();
  const statusF = document.getElementById('adminStatusFilter').value;
  const levelF = document.getElementById('adminLevelFilter').value;

  API.ui.showSkeleton('adminSubmissionsBody', 'table', 6);
  try {
    const params = { limit: 500 };
    if (statusF) params.status = statusF;
    if (levelF) params.level = levelF;
    if (search) params.search = search;

    const subs = await API.submissions.list(params);
    const tbody = document.getElementById('adminSubmissionsBody');

    tbody.innerHTML = subs.length ? subs.map(s => {
      const checked = selectedRefs.includes(s.ref) ? 'checked' : '';
      const revisionPill = s.is_revision ? `<span class="pill" style="background:#ede9fe;color:#5b21b6;font-size:.68rem">Rev</span>` : '';

      return `
        <tr>
          <td><input type="checkbox" class="row-check" data-ref="${API.escapeHtml(s.ref)}" ${checked} /></td>
          <td><strong>${API.escapeHtml(s.ref)}</strong> ${revisionPill}</td>
          <td>${API.escapeHtml(s.school_name || '')}</td>
          <td>${API.levelLabel(s.school_level)}</td>
          <td>${API.escapeHtml(s.doc_type)}</td>
          <td>${API.escapeHtml(s.school_year)}</td>
          <td>${API.escapeHtml((s.first_name || '') + ' ' + (s.last_name || ''))}</td>
          <td>${new Date(s.submitted_at).toLocaleDateString('en-PH')}</td>
          <td>${s.file_count || 0} file(s)</td>
          <td>${API.statusPill(s.status)}</td>
          <td>
            <button class="action-btn review" onclick="openReview('${API.escapeHtml(s.ref)}')">
              <i class="fas fa-eye"></i> Review
            </button>
          </td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="11" style="text-align:center;color:var(--text-muted);padding:32px">No submissions found.</td></tr>`;

    tbody.querySelectorAll('.row-check').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!selectedRefs.includes(cb.dataset.ref)) selectedRefs.push(cb.dataset.ref);
        } else {
          selectedRefs = selectedRefs.filter(r => r !== cb.dataset.ref);
        }
        updateBulkBar();
      });
    });
  } catch (err) {
    API.showToast(`Failed to load submissions: ${err.message}`, 'error');
    const tbody = document.getElementById('adminSubmissionsBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:var(--danger);padding:24px">Failed to load submissions. <button class="btn btn-sm btn-outline" onclick="loadAllSubmissions()">Retry</button></td></tr>`;
  }
}

document.getElementById('adminSearch')?.addEventListener('input', API.debounce(loadAllSubmissions, 400));
document.getElementById('adminStatusFilter')?.addEventListener('change', loadAllSubmissions);
document.getElementById('adminLevelFilter')?.addEventListener('change', loadAllSubmissions);

document.getElementById('selectAll')?.addEventListener('change', function () {
  document.querySelectorAll('.row-check').forEach(cb => {
    cb.checked = this.checked;
    if (this.checked) {
      if (!selectedRefs.includes(cb.dataset.ref)) selectedRefs.push(cb.dataset.ref);
    } else {
      selectedRefs = selectedRefs.filter(r => r !== cb.dataset.ref);
    }
  });
  updateBulkBar();
});

function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  if (selectedRefs.length > 0) {
    bar.removeAttribute('hidden');
    document.getElementById('bulkCount').textContent = `${selectedRefs.length} selected`;
  } else {
    bar.setAttribute('hidden', '');
  }
}

/* ===== BULK ACTIONS ===== */
document.getElementById('bulkApproveBtn')?.addEventListener('click', async () => {
  if (!selectedRefs.length) return;
  const btn = document.getElementById('bulkApproveBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
  try {
    await Promise.all(selectedRefs.map(ref => API.submissions.review(ref, 'approve', '')));
    API.showToast(`${selectedRefs.length} submission(s) approved.`, 'success');
    selectedRefs = []; updateBulkBar();
    loadAllSubmissions(); loadAdminDashboard();
  } catch (err) { API.showToast(`Bulk approve failed: ${err.message}`, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Approve Selected'; } }
});

document.getElementById('bulkReturnBtn')?.addEventListener('click', () => {
  if (!selectedRefs.length) return;
  document.getElementById('bulkReturnRemarks').value = '';
  document.getElementById('bulkReturnErr').textContent = '';
  document.getElementById('bulkReturnModal').removeAttribute('hidden');
});

document.getElementById('bulkReturnConfirmBtn')?.addEventListener('click', async () => {
  const remarks = document.getElementById('bulkReturnRemarks').value.trim();
  if (!remarks) { document.getElementById('bulkReturnErr').textContent = 'Please provide a reason.'; return; }

  const btn = document.getElementById('bulkReturnConfirmBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
  try {
    await Promise.all(selectedRefs.map(ref => API.submissions.review(ref, 'return', remarks)));
    document.getElementById('bulkReturnModal').setAttribute('hidden', '');
    API.showToast(`${selectedRefs.length} submission(s) returned with feedback.`, 'success');
    selectedRefs = []; updateBulkBar();
    loadAllSubmissions(); loadAdminDashboard();
  } catch (err) { API.showToast(`Bulk return failed: ${err.message}`, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-undo"></i> Confirm Return'; } }
});

document.getElementById('bulkClearBtn')?.addEventListener('click', () => {
  selectedRefs = [];
  document.querySelectorAll('.row-check').forEach(cb => cb.checked = false);
  document.getElementById('selectAll').checked = false;
  updateBulkBar();
});
document.getElementById('bulkReturnModalClose')?.addEventListener('click', () => document.getElementById('bulkReturnModal').setAttribute('hidden', ''));
document.getElementById('bulkReturnCancelBtn')?.addEventListener('click', () => document.getElementById('bulkReturnModal').setAttribute('hidden', ''));

/* ===== REVIEW MODAL ===== */
let currentReviewRef = null;

async function openReview(ref) {
  currentReviewRef = ref;
  try {
    const s = await API.submissions.get(ref);

    let fileLinks = '';
    if (s.files && s.files.length) {
      fileLinks = `<br/><div style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">
        <strong>Attached Files:</strong><div style="display:flex; gap:8px; flex-wrap:wrap;">`;

      if (s.files.length > 1) {
        fileLinks += `<button class="action-btn" style="background:#f1f5f9" onclick="downloadAllAdminFiles('${API.escapeHtml(s.ref)}')"><i class="fas fa-file-archive"></i> Download All (ZIP)</button>`;
      }
      fileLinks += s.files.map(f => `
        <div style="display:inline-flex; border:1px solid var(--border,#e2e8f0); border-radius:4px; overflow:hidden;">
          <button class="action-btn view" style="border:none; border-right:1px solid var(--border,#e2e8f0); border-radius:0; margin:0;" onclick="previewAdminFile('${API.escapeHtml(s.ref)}', ${f.id}, '${API.escapeHtml(f.original_name)}', '${API.escapeHtml(f.mime_type)}')">
            <i class="fas fa-eye"></i> Preview
          </button>
          <button class="action-btn" style="border:none; border-radius:0; margin:0; background:#f8fafc;" title="Download" onclick="downloadFile('${API.escapeHtml(s.ref)}', ${f.id}, '${API.escapeHtml(f.original_name)}')">
            <i class="fas fa-download"></i>
          </button>
          <span style="padding:4px 8px; font-size:0.75rem; background:#fff; display:flex; align-items:center;">${API.escapeHtml(f.original_name)}</span>
        </div>
      `).join('');
      fileLinks += `</div></div>`;
    }

    document.getElementById('reviewDetails').innerHTML = `
      <strong>Reference:</strong> ${API.escapeHtml(s.ref)}<br/>
      <strong>School:</strong> ${API.escapeHtml(s.school_name || '')} (${API.levelLabel(s.school_level)})<br/>
      <strong>Document Type:</strong> ${API.escapeHtml(s.doc_type)}<br/>
      <strong>School Year:</strong> ${API.escapeHtml(s.school_year)}<br/>
      <strong>Submitted By:</strong> ${API.escapeHtml((s.first_name || '') + ' ' + (s.last_name || ''))} \u2013 ${API.escapeHtml(s.staff_position || '')}<br/>
      <strong>Date:</strong> ${new Date(s.submitted_at).toLocaleDateString('en-PH')}<br/>
      <strong>Files:</strong> ${s.file_count || 0} file(s)<br/>
      <strong>Status:</strong> ${API.statusPill(s.status)}
      ${s.feedback ? `<br/><strong>Previous Feedback:</strong> <em>${API.escapeHtml(s.feedback)}</em>` : ''}
      ${fileLinks}
    `;

    document.getElementById('reviewRemarks').value = s.feedback || '';
    document.getElementById('reviewRemarksErr').textContent = '';
    document.getElementById('reviewModal').removeAttribute('hidden');
    await loadReviewThread(ref);
  } catch (err) { API.showToast(`Failed to load submission: ${err.message}`, 'error'); }
}

function closeReviewModal() {
  document.getElementById('reviewModal').setAttribute('hidden', '');
  currentReviewRef = null;
  const cl = document.getElementById('reviewCommentsList');
  if (cl) cl.innerHTML = '';
  const nc = document.getElementById('reviewNewComment');
  if (nc) nc.value = '';
}

window.downloadAllAdminFiles = async function (ref) {
  try {
    await API.submissions.downloadAll(ref);
  } catch (err) { API.showToast(`Download failed: ${err.message}`, 'error'); }
}

window.previewAdminFile = async function (ref, fileId, filename, mimeType) {
  const modal = document.getElementById('previewModal');
  const title = document.getElementById('previewModalTitle');
  const iframe = document.getElementById('previewIframe');
  const unsupported = document.getElementById('previewUnsupported');

  title.textContent = filename;
  modal.removeAttribute('hidden');
  iframe.src = '';

  if (mimeType === 'application/pdf') {
    iframe.removeAttribute('hidden'); unsupported.setAttribute('hidden', '');
    try {
      iframe.src = await API.submissions.getFileBlob(ref, fileId);
    } catch (err) { API.showToast(`Preview failed: ${err.message}`, 'error'); modal.setAttribute('hidden', ''); }
  } else {
    iframe.setAttribute('hidden', ''); unsupported.removeAttribute('hidden');
    document.getElementById('previewDownloadBtn').onclick = () => window.downloadFile(ref, fileId, filename);
  }
}

async function downloadFile(ref, fileId, filename) {
  try {
    await API.submissions.downloadFile(ref, fileId, filename);
  } catch (err) {
    API.showToast(`Download failed: ${err.message}`, 'error');
  }
}
document.getElementById('reviewModalClose')?.addEventListener('click', closeReviewModal);
document.getElementById('reviewModalClose2')?.addEventListener('click', closeReviewModal);

document.getElementById('reviewPostCommentBtn')?.addEventListener('click', async () => {
  if (!currentReviewRef) return;
  const t = document.getElementById('reviewNewComment');
  const body = (t && t.value || '').trim();
  if (!body) { API.showToast('Write a note first.', 'error'); return; }
  try {
    await API.submissions.postComment(currentReviewRef, body);
    if (t) t.value = '';
    await loadReviewThread(currentReviewRef);
    API.showToast('Note posted.', 'success');
  } catch (e) { API.showToast(e.message || 'Failed to post note.', 'error'); }
});

document.getElementById('approveBtn')?.addEventListener('click', async () => {
  if (!currentReviewRef) return;
  const btn = document.getElementById('approveBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
  try {
    const remarks = document.getElementById('reviewRemarks').value.trim();
    await API.submissions.review(currentReviewRef, 'approve', remarks);
    closeReviewModal();
    API.showToast(`${currentReviewRef} approved.`, 'success');
    loadAllSubmissions(); loadAdminDashboard();
  } catch (err) { API.showToast(`Approve failed: ${err.message}`, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Approve'; } }
});

document.getElementById('returnBtn')?.addEventListener('click', async () => {
  if (!currentReviewRef) return;
  const remarks = document.getElementById('reviewRemarks').value.trim();
  if (!remarks) { document.getElementById('reviewRemarksErr').textContent = 'Feedback is required when returning a submission.'; return; }
  const btn = document.getElementById('returnBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
  try {
    await API.submissions.review(currentReviewRef, 'return', remarks);
    closeReviewModal();
    API.showToast(`${currentReviewRef} returned with feedback.`, 'success');
    loadAllSubmissions(); loadAdminDashboard();
  } catch (err) { API.showToast(`Return failed: ${err.message}`, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-undo"></i> Return with Feedback'; } }
});

/* ===== SCHOOLS ===== */
async function loadSchools() {
  const search = document.getElementById('schoolSearch').value.toLowerCase();
  const levelF = document.getElementById('schoolLevelFilter').value;
  API.ui.showSkeleton('schoolsGrid', 'card', 6);
  try {
    const schools = await API.admin.schools();
    const iconMap = { kindergarten: 'kinder', elementary: 'elem', junior: 'junior', senior: 'senior' };
    const tagMap = { kindergarten: 'tag-kinder', elementary: 'tag-elem', junior: 'tag-junior', senior: 'tag-senior' };

    const filtered = schools.filter(s => {
      const ms = !search || s.name.toLowerCase().includes(search) || s.school_code.toLowerCase().includes(search);
      const ml = !levelF || s.level === levelF;
      return ms && ml;
    });

    document.getElementById('schoolsGrid').innerHTML = filtered.map(s => `
      <div class="school-card">
        <div class="school-card-header">
          <div class="school-card-icon ${iconMap[s.level] || ''}"><i class="fas fa-school"></i></div>
          <div>
            <div class="school-card-name">${API.escapeHtml(s.name)}</div>
            <div class="school-card-id">${s.school_code}</div>
          </div>
        </div>
        <div class="school-card-meta">
          <span class="school-meta-tag ${tagMap[s.level] || ''}">${API.levelLabel(s.level)}</span>
          <span class="school-meta-tag" style="background:#f1f5f9;color:#64748b">${s.submission_count || 0} submissions</span>
          <span class="school-meta-tag" style="background:#f1f5f9;color:#64748b">${s.staff_count || 0} staff</span>
        </div>
        <p style="font-size:.78rem;color:var(--text-muted);margin-top:10px">${API.escapeHtml(s.email || '')}</p>
      </div>
    `).join('') || `<p style="color:var(--text-muted);padding:24px;text-align:center">No schools found.</p>`;
  } catch (err) { API.showToast(`Failed to load schools: ${err.message}`, 'error'); }
}
document.getElementById('schoolSearch')?.addEventListener('input', API.debounce(loadSchools, 400));
document.getElementById('schoolLevelFilter')?.addEventListener('change', loadSchools);

/* ===== STAFF ACCOUNTS ===== */
async function loadStaffPage() {
  API.ui.showSkeleton('pendingStaffList', 'list', 2);
  API.ui.showSkeleton('allStaffBody', 'table', 5);
  try {
    const allStaff = await API.staff.list();
    const pending = allStaff.filter(a => !a.status || a.status === 'pending');

    document.querySelectorAll('#staffPendingBadge, .staff-pending-badge').forEach(badge => {
      if (pending.length > 0) {
        badge.removeAttribute('hidden');
        badge.textContent = pending.length;
      } else {
        badge.setAttribute('hidden', '');
        badge.textContent = '0';
      }
    });

    // Pending approvals
    const pendingContainer = document.getElementById('pendingStaffList');
    pendingContainer.innerHTML = pending.length ? pending.map(a => `
      <div class="staff-approval-card">
        <div class="staff-approval-avatar"><i class="fas fa-user-tie"></i></div>
        <div class="staff-approval-info">
          <strong>${API.escapeHtml(a.first_name + ' ' + a.last_name)}</strong>
          <span>${API.escapeHtml(a.position || '')} \u2013 ${API.escapeHtml(a.school_name || '')} | ${API.escapeHtml(a.email)}</span>
        </div>
        <div class="staff-approval-btns">
          <button class="btn btn-sm btn-success" onclick="updateStaffStatus(${a.id}, 'approved')"><i class="fas fa-check"></i> Approve</button>
          <button class="btn btn-sm btn-outline" style="color:var(--danger);border-color:var(--danger)" onclick="updateStaffStatus(${a.id}, 'rejected')"><i class="fas fa-times"></i> Reject</button>
        </div>
      </div>
    `).join('') : `<p style="color:var(--text-muted);font-size:.88rem;padding:8px 0">No pending registrations.</p>`;

    // All staff table
    const search = document.getElementById('staffSearch').value.toLowerCase();
    const filtered = allStaff.filter(a => !search ||
      (a.first_name + ' ' + a.last_name).toLowerCase().includes(search) ||
      (a.email || '').toLowerCase().includes(search));

    document.getElementById('allStaffBody').innerHTML = filtered.length ? filtered.map(a => {
      const status = a.status || 'pending';
      const badge = status === 'approved' ? `<span class="pill pill-approved">Approved</span>` :
        status === 'rejected' ? `<span class="pill pill-returned">Rejected</span>` :
          `<span class="pill pill-review">Pending</span>`;
      const date = a.created_at ? new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '\u2014';

      return `
        <tr>
          <td><strong>${API.escapeHtml(a.first_name + ' ' + a.last_name)}</strong></td>
          <td>${API.escapeHtml(a.position || '')}</td>
          <td>${API.escapeHtml(a.school_name || '')}</td>
          <td>${API.escapeHtml(a.email)}</td>
          <td>${badge}</td>
          <td>${date}</td>
          <td>
            ${status !== 'approved' ? `<button class="action-btn approve" onclick="updateStaffStatus(${a.id}, 'approved')"><i class="fas fa-check"></i> Approve</button> ` : ''}
            ${status !== 'rejected' ? `<button class="action-btn return" onclick="updateStaffStatus(${a.id}, 'rejected')"><i class="fas fa-ban"></i> Deactivate</button>` : ''}
          </td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">No staff accounts found.</td></tr>`;
  } catch (err) { API.showToast(`Failed to load staff: ${err.message}`, 'error'); }
}

async function updateStaffStatus(id, status) {
  try {
    await API.staff.updateStatus(id, status);
    API.showToast(`Staff account ${status}.`, 'success');
    loadStaffPage(); loadAdminDashboard();
  } catch (err) { API.showToast(`Failed: ${err.message}`, 'error'); }
}
document.getElementById('staffSearch')?.addEventListener('input', API.debounce(loadStaffPage, 400));

/* ===== REPORTS ===== */
async function loadReports() {
  try {
    const [stats, subs] = await Promise.all([API.admin.stats(), API.submissions.list({ limit: 1000 })]);
    document.getElementById('rptApprovalRate').textContent = stats.total ? Math.round(stats.approved / stats.total * 100) + '%' : '0%';
    document.getElementById('rptReturned').textContent = stats.returned || 0;

    const now = new Date();
    const thisMonth = subs.filter(s => {
      const d = new Date(s.submitted_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    document.getElementById('rptThisMonth').textContent = thisMonth.length;

    const byType = {};
    subs.forEach(s => { byType[s.doc_type] = (byType[s.doc_type] || 0) + 1; });
    const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxType = typeEntries[0] ? typeEntries[0][1] : 1;

    document.getElementById('reportBars').innerHTML = typeEntries.map(([label, count]) => `
      <div class="report-bar-item">
        <div class="report-bar-label">${API.escapeHtml(label)}</div>
        <div class="report-bar-track">
          <div class="report-bar-fill" style="width:${Math.round(count / maxType * 100)}%"></div>
        </div>
        <div class="report-bar-count">${count}</div>
      </div>
    `).join('') || `<p style="color:var(--text-muted);padding:16px">No data yet.</p>`;

    const bySchool = {};
    subs.forEach(s => { bySchool[s.school_name || 'Unknown'] = (bySchool[s.school_name || 'Unknown'] || 0) + 1; });
    const schoolEntries = Object.entries(bySchool).sort((a, b) => b[1] - a[1]);
    const maxSchool = schoolEntries[0] ? schoolEntries[0][1] : 1;

    document.getElementById('reportBySchool').innerHTML = schoolEntries.map(([label, count]) => `
      <div class="report-bar-item">
        <div class="report-bar-label" style="width:160px">${API.escapeHtml(label)}</div>
        <div class="report-bar-track">
          <div class="report-bar-fill" style="width:${Math.round(count / maxSchool * 100)}%;background:var(--success)"></div>
        </div>
        <div class="report-bar-count">${count}</div>
      </div>
    `).join('') || `<p style="color:var(--text-muted);padding:16px">No data yet.</p>`;
  } catch (err) { API.showToast(`Failed to load reports: ${err.message}`, 'error'); }
}

/* ===== EXPORT ===== */
document.getElementById('exportAdminBtn')?.addEventListener('click', async () => {
  try {
    const subs = await API.submissions.list({ limit: 5000 });
    API.exportToCSV(
      subs.map(s => [s.ref, s.school_name || '', API.levelLabel(s.school_level), s.doc_type, s.school_year,
      (s.first_name || '') + ' ' + (s.last_name || ''), new Date(s.submitted_at).toLocaleDateString('en-PH'),
      s.file_count || 0, s.status, s.feedback || '']),
      ['Reference', 'School', 'Level', 'Document Type', 'School Year', 'Submitted By', 'Date', 'Files', 'Status', 'Feedback'],
      'all_submissions.csv'
    );
  } catch (err) { API.showToast(`Export failed: ${err.message}`, 'error'); }
});

document.getElementById('exportReportBtn')?.addEventListener('click', async () => {
  try {
    const subs = await API.submissions.list({ limit: 5000 });
    API.exportToCSV(
      subs.map(s => [s.ref, s.school_name || '', s.doc_type, s.school_year, s.status, new Date(s.submitted_at).toLocaleDateString('en-PH')]),
      ['Reference', 'School', 'Document Type', 'School Year', 'Status', 'Date'],
      `report_${new Date().toISOString().slice(0, 10)}.csv`
    );
  } catch (err) { API.showToast(`Export failed: ${err.message}`, 'error'); }
});

/* ===== AUDIT LOG ===== */
async function loadAuditLog() {
  const search = document.getElementById('auditSearch').value.toLowerCase();
  const actionF = document.getElementById('auditActionFilter').value;
  API.ui.showSkeleton('auditLogList', 'list', 6);
  try {
    const params = { limit: 200 };
    if (actionF) params.action = actionF;
    if (search) params.search = search;
    const log = await API.admin.audit(params);

    const badgeMap = { submit: 'submit', approve: 'approve', return: 'return', resub: 'resub', login: 'login' };
    const labelMap = { submit: 'Submitted', approve: 'Approved', return: 'Returned', resub: 'Resubmitted', login: 'Account Action' };

    document.getElementById('auditLogList').innerHTML = log.length ? log.map(e => `
      <div class="audit-item">
        <span class="audit-badge ${badgeMap[e.action] || 'login'}">${labelMap[e.action] || e.action}</span>
        <div class="audit-text">
          <strong>${API.escapeHtml(e.ref || '\u2014')}</strong>
          ${e.doc_type ? ` \u2013 ${API.escapeHtml(e.doc_type)}` : ''}
          | School: ${API.escapeHtml(e.school_name || '\u2014')}
          | By: ${API.escapeHtml(e.staff_name || e.admin_name || '\u2014')}
          ${e.remarks ? `<br/><em style="font-size:.78rem;color:var(--text-muted)">Feedback: ${API.escapeHtml(e.remarks)}</em>` : ''}
        </div>
        <span class="audit-time">${API.timeAgo(e.created_at)}</span>
      </div>
    `).join('') : `<p style="color:var(--text-muted);text-align:center;padding:32px">No audit entries found.</p>`;
  } catch (err) { API.showToast(`Failed to load audit log: ${err.message}`, 'error'); }
}
document.getElementById('auditSearch')?.addEventListener('input', API.debounce(loadAuditLog, 400));
document.getElementById('auditActionFilter')?.addEventListener('change', loadAuditLog);

document.getElementById('exportAuditBtn')?.addEventListener('click', async () => {
  try {
    const log = await API.admin.audit({ limit: 5000 });
    API.exportToCSV(
      log.map(e => [e.action, e.ref || '', e.school_name || '', e.staff_name || e.admin_name || '', e.doc_type || '', e.remarks || '', new Date(e.created_at).toLocaleString('en-PH')]),
      ['Action', 'Reference', 'School', 'By', 'Document', 'Remarks', 'Timestamp'],
      'audit_log.csv'
    );
  } catch (err) { API.showToast(`Export failed: ${err.message}`, 'error'); }
});

/* ===== DEADLINES ===== */
async function loadDeadlineMgmt() {
  API.ui.showSkeleton('deadlineMgmtList', 'list', 4);
  try {
    const deadlines = await API.admin.getDeadlines();
    const list = document.getElementById('deadlineMgmtList');

    list.innerHTML = deadlines.length ? deadlines.map(d => {
      const days = API.getDaysUntil(d.deadline);
      const numCls = days < 0 ? 'overdue' : days <= 3 ? 'urgent' : days <= 7 ? 'warning' : 'ok';

      return `
        <div class="deadline-mgmt-row">
          <div class="deadline-days" style="min-width:56px;text-align:center">
            <span class="days-num ${numCls}" style="font-size:1.4rem">${days < 0 ? '!' : days}</span>
            <span class="days-label" style="font-size:.65rem">${days < 0 ? 'overdue' : 'days'}</span>
          </div>
          <div style="flex:1">
            <strong style="font-size:.9rem">${API.escapeHtml(d.doc_type)}</strong>
            <span style="font-size:.78rem;color:var(--text-muted);display:block">
              SY ${API.escapeHtml(d.school_year)} | ${API.escapeHtml(d.level === 'all' ? 'All Levels' : API.levelLabel(d.level))} | Due: ${API.escapeHtml(d.deadline)}
            </span>
          </div>
          <button class="action-btn return" onclick="deleteDeadline(${d.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      `;
    }).join('') : `<p style="color:var(--text-muted);text-align:center;padding:24px">No deadlines set yet.</p>`;
  } catch (err) { API.showToast(`Failed to load deadlines: ${err.message}`, 'error'); }
}

async function deleteDeadline(id) {
  try { await API.admin.deleteDeadline(id); loadDeadlineMgmt(); API.showToast('Deadline removed.', 'success'); }
  catch (err) { API.showToast(`Failed: ${err.message}`, 'error'); }
}

document.getElementById('addDeadlineBtn')?.addEventListener('click', () => {
  document.getElementById('deadlineFormCard').removeAttribute('hidden');
  document.getElementById('addDeadlineBtn').setAttribute('hidden', '');
});
document.getElementById('cancelDeadline')?.addEventListener('click', () => {
  document.getElementById('deadlineFormCard').setAttribute('hidden', '');
  document.getElementById('addDeadlineBtn').removeAttribute('hidden');
  document.getElementById('deadlineForm').reset();
});
document.getElementById('deadlineForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const docType = document.getElementById('dlDocType').value;
  const year = document.getElementById('dlYear').value;
  const date = document.getElementById('dlDate').value;
  const level = document.getElementById('dlLevel').value;

  if (!docType || !date) { API.showToast('Document type and date are required.', 'error'); return; }
  try {
    await API.admin.postDeadline({ docType, schoolYear: year, deadline: date, level });
    document.getElementById('deadlineForm').reset();
    document.getElementById('deadlineFormCard').setAttribute('hidden', '');
    document.getElementById('addDeadlineBtn').removeAttribute('hidden');
    loadDeadlineMgmt(); API.showToast('Deadline saved.', 'success');
  } catch (err) { API.showToast(`Failed: ${err.message}`, 'error'); }
});

/* ===== NOTICES ===== */
async function loadNotices() {
  API.ui.showSkeleton('adminNoticesList', 'list', 4);
  try {
    try {
      const analytics = await API.admin.getNoticesAnalytics();
      const trend = analytics.trend || [];
      document.getElementById('noticeAudience').textContent = analytics.audience || 0;
      document.getElementById('noticeViewedSchools').textContent = analytics.viewedSchools || 0;
      document.getElementById('noticeViewRate').textContent = `${analytics.viewRate || 0}%`;
      const trendWrap = document.getElementById('noticeTrend');
      if (trendWrap) {
        const max = trend.reduce((m, row) => Math.max(m, row.views || 0), 1);
        trendWrap.innerHTML = trend.length ? trend.map((row) => `
          <div class="report-bar-item">
            <div class="report-bar-label">${API.escapeHtml(new Date(row.day).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }))}</div>
            <div class="report-bar-track"><div class="report-bar-fill" style="width:${Math.round(((row.views || 0) / max) * 100)}%"></div></div>
            <div class="report-bar-count">${row.views || 0}</div>
          </div>
        `).join('') : '<p style="color:var(--text-muted);padding:12px">No notice views in the last 7 days.</p>';
      }
    } catch {
      const trendWrap = document.getElementById('noticeTrend');
      if (trendWrap) trendWrap.innerHTML = '<p style="color:var(--text-muted);padding:12px">Analytics unavailable right now.</p>';
    }

    const notices = await API.admin.getNotices();
    const list = document.getElementById('adminNoticesList');

    list.innerHTML = notices.map(n => {
      const ic = n.type === 'info' ? 'fa-info-circle' : n.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle';
      return `
        <div class="notice-item notice-${n.type}">
          <i class="fas ${ic}"></i>
          <div style="flex:1">
            <strong>${API.escapeHtml(n.title)}</strong>
            <p>${API.escapeHtml(n.message)}</p>
            <span class="notice-date">${new Date(n.created_at).toLocaleDateString('en-PH')} | Target: ${API.escapeHtml(n.target_school_name || (n.target_level === 'all' ? 'All Schools' : API.levelLabel(n.target_level)))}</span>
            <span class="notice-date">Read by ${n.view_count || 0} school user(s)</span>
          </div>
          <button class="action-btn return" onclick="deleteNotice(${n.id})" style="flex-shrink:0"><i class="fas fa-trash"></i></button>
        </div>
      `;
    }).join('');
    if (!notices.length) renderEmpty(list, 'No notices yet. Post your first announcement.');
  } catch (err) {
    API.showToast(`Failed to load notices: ${err.message}`, 'error');
    renderError(document.getElementById('adminNoticesList'), 'Unable to load notices.', 'loadNotices()');
  }
}

async function deleteNotice(id) {
  try { await API.admin.deleteNotice(id); loadNotices(); API.showToast('Notice deleted.', 'success'); }
  catch (err) { API.showToast(`Failed: ${err.message}`, 'error'); }
}

document.getElementById('addNoticeBtn')?.addEventListener('click', () => {
  document.getElementById('noticeFormCard').removeAttribute('hidden');
  document.getElementById('addNoticeBtn').setAttribute('hidden', '');
});
document.getElementById('cancelNotice')?.addEventListener('click', () => {
  document.getElementById('noticeFormCard').setAttribute('hidden', '');
  document.getElementById('addNoticeBtn').removeAttribute('hidden');
  document.getElementById('noticeForm').reset();
});
document.getElementById('noticeForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const title = document.getElementById('noticeTitle').value.trim();
  const msg = document.getElementById('noticeMessage').value.trim();
  const type = document.getElementById('noticeType').value;
  const targetLevel = document.getElementById('noticeTargetLevel').value;
  const targetSchoolId = document.getElementById('noticeTargetSchool').value;

  if (!title || !msg) { API.showToast('Title and message are required.', 'error'); return; }
  try {
    await API.admin.postNotice({ type, title, message: msg, targetLevel, targetSchoolId: targetSchoolId || null });
    document.getElementById('noticeForm').reset();
    document.getElementById('noticeFormCard').setAttribute('hidden', '');
    document.getElementById('addNoticeBtn').removeAttribute('hidden');
    loadNotices(); API.showToast('Notice posted.', 'success');
  } catch (err) { API.showToast(`Failed: ${err.message}`, 'error'); }
});

async function populateNoticeTargetSchools() {
  try {
    const schools = await API.admin.schools();
    const target = document.getElementById('noticeTargetSchool');
    if (!target) return;
    target.innerHTML = '<option value="">All Schools (for selected level)</option>' +
      schools.map(s => `<option value="${s.id}">${API.escapeHtml(s.name)} (${API.levelLabel(s.level)})</option>`).join('');
  } catch { }
}
populateNoticeTargetSchools();

async function loadValidationRules() {
  const list = document.getElementById('validationRulesList');
  if (!list) return;
  API.ui.showSkeleton('validationRulesList', 'list', 4);
  try {
    const rules = await API.admin.getValidationRules();
    list.innerHTML = rules.map((r) => `
      <div class="audit-item">
        <span class="audit-badge ${r.is_enabled ? 'approve' : 'return'}">${r.is_enabled ? 'Enabled' : 'Disabled'}</span>
        <div class="audit-text">
          <strong>${API.escapeHtml(r.label)}</strong>
          <span style="font-size:.78rem;color:var(--text-muted);display:block">
            Code: ${API.escapeHtml(r.code)} | Severity: ${API.escapeHtml(r.severity)} | Config: ${API.escapeHtml(JSON.stringify(r.rule_config || {}))}
          </span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm ${r.is_enabled ? 'btn-ghost' : 'btn-success'}" onclick='toggleRule(${JSON.stringify(r.code)}, ${!r.is_enabled}, ${JSON.stringify(r.label)}, ${JSON.stringify(r.severity)}, ${JSON.stringify(r.rule_config || {})})'>
            ${r.is_enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
    `).join('') || `<p style="color:var(--text-muted);text-align:center;padding:24px">No validation rules yet. Run <code>npm run db:seed</code> once to install defaults.</p>`;
  } catch (err) {
    renderError(list, `Failed to load validation rules: ${err.message}`, 'loadValidationRules()');
  }
}

async function toggleRule(code, isEnabled, label, severity, ruleConfig) {
  try {
    await API.admin.saveValidationRule({ code, label, severity, isEnabled, ruleConfig });
    API.showToast('Validation rule updated.', 'success');
    loadValidationRules();
  } catch (err) {
    API.showToast(`Failed to update rule: ${err.message}`, 'error');
  }
}

/* ===== SETTINGS ===== */
document.getElementById('adminProfileForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await API.admin.updateProfile({
      fullName: document.getElementById('adminFullName').value,
      position: document.getElementById('adminPosition').value,
      email: document.getElementById('adminEmail').value,
      phone: document.getElementById('adminPhone').value,
    });
    API.showToast('Profile updated.', 'success');
  } catch (err) { API.showToast(`Update failed: ${err.message}`, 'error'); }
});

document.getElementById('adminPwForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await API.admin.changePassword({
      currentPassword: document.getElementById('adminCurrPw').value,
      newPassword: document.getElementById('adminNewPw').value,
    });
    API.showToast('Password updated.', 'success');
    document.getElementById('adminPwForm').reset();
  } catch (err) { API.showToast(`Password update failed: ${err.message}`, 'error'); }
});

/* ===== LOGOUT ===== */
document.getElementById('logoutBtn')?.addEventListener('click', () => API.auth.logout());

/* ===== ANALYTICS TIME FILTERS ===== */
document.querySelectorAll('.v2-filter-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const group = e.target.closest('.v2-time-filters');
    if (group) {
      group.querySelectorAll('.v2-filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      API.showToast('Data filtered by: ' + e.target.textContent, 'info');
    }
  });
});

/* ===== INIT ===== */
loadAdminDashboard();
