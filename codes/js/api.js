/**
 * SMME Portal – API Client
 * Token is stored in sessionStorage — cleared on tab close AND on page refresh.
 * Refresh detection: a 'smme_active' flag is written to sessionStorage on login
 * and checked via performance.navigation / PerformanceNavigationTiming on load.
 * If a reload is detected, the session is wiped before anything else runs.
 */

/* ── Refresh / reload detection (runs immediately, before API is used) ── */
(function clearSessionOnReload() {
  // performance.getEntriesByType is the modern standard
  let isReload = false;
  if (window.performance) {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      isReload = nav.type === 'reload';
    } else {
      // Fallback for older browsers
      isReload = performance.navigation && performance.navigation.type === 1;
    }
  }
  if (isReload) {
    sessionStorage.removeItem('smme_token');
    sessionStorage.removeItem('smme_user');
  }
})();

const API = (() => {
  const BASE = '/api';

  /* ── Token management ── */
  function getToken()        { return sessionStorage.getItem('smme_token'); }
  function setToken(t)       { sessionStorage.setItem('smme_token', t); }
  function clearToken()      { sessionStorage.removeItem('smme_token'); sessionStorage.removeItem('smme_user'); }

  function getUser() {
    try { return JSON.parse(sessionStorage.getItem('smme_user') || 'null'); }
    catch { return null; }
  }
  function setUser(u) { sessionStorage.setItem('smme_user', JSON.stringify(u)); }

  /* ── Core fetch wrapper ── */
  async function req(method, path, body, isFormData) {
    const headers = {};
    const token   = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
    return data;
  }

  const get    = (path)        => req('GET',    path);
  const post   = (path, body)  => req('POST',   path, body);
  const patch  = (path, body)  => req('PATCH',  path, body);
  const del    = (path)        => req('DELETE', path);
  const upload = (path, form)  => req('POST',   path, form, true);

  /* ══════════════════════════════════════════
     AUTH
  ══════════════════════════════════════════ */
  const auth = {
    async loginStaff(emailOrSchoolId, emailOrPassword, passwordOrUndef) {
      // Support both: loginStaff(email, password) and legacy loginStaff(schoolId, email, password)
      let email, password;
      if (passwordOrUndef !== undefined) {
        // Legacy 3-arg call: loginStaff(schoolId, email, password) — schoolId is ignored
        email = emailOrPassword;
        password = passwordOrUndef;
      } else {
        email = emailOrSchoolId;
        password = emailOrPassword;
      }
      const data = await post('/auth/staff/login', { email, password });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    },

    async loginAdmin(username, password) {
      const data = await post('/auth/admin/login', { username, password });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    },

    async register(payload) {
      return post('/auth/staff/register', payload);
    },

    async getSchools() {
      return get('/auth/schools');
    },

    logout() {
      clearToken();
      window.location.href = '/html/login.html?logout=1';
    },

    getUser,

    isLoggedIn() { return !!getToken(); },

    /**
     * Verify the stored token is still valid by calling the server.
     * Returns the user object if valid, null if expired/invalid.
     * Also clears stale tokens automatically.
     */
    async verifySession() {
      if (!getToken()) return null;
      try {
        const data = await get('/auth/me');
        return data.user || null;
      } catch {
        clearToken();
        return null;
      }
    },
  };

  /* ══════════════════════════════════════════
     SUBMISSIONS
  ══════════════════════════════════════════ */
  const submissions = {
    async list(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return get('/submissions' + (qs ? '?' + qs : ''));
    },

    async get(ref) {
      return get('/submissions/' + ref);
    },

    async submit(formData) {
      return upload('/submissions', formData);
    },
    async validate(data) {
      return post('/submissions/validate', data);
    },

    async review(ref, action, feedback) {
      return patch('/submissions/' + ref + '/review', { action, feedback });
    },

    async listComments(ref) {
      return get('/submissions/' + encodeURIComponent(ref) + '/comments');
    },

    async postComment(ref, body) {
      return post('/submissions/' + encodeURIComponent(ref) + '/comments', { body });
    },

    /**
     * Download a submission file securely using the Authorization header.
     * The token is never exposed in the URL, browser history, or server logs.
     */
    async downloadFile(ref, fileId, filename) {
      const token = getToken();
      const res = await fetch(BASE + '/submissions/' + ref + '/files/' + fileId, {
        method: 'GET',
        headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Download failed (' + res.status + ')');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };

  /* ══════════════════════════════════════════
     NOTIFICATIONS
  ══════════════════════════════════════════ */
  const notifications = {
    async list()         { return get('/notifications'); },
    async unreadCount()  { return get('/notifications/unread-count'); },
    async markRead(id)   { return patch('/notifications/' + id + '/read'); },
    async markAllRead()  { return patch('/notifications/read-all'); },
  };

  /* ══════════════════════════════════════════
     STAFF
  ══════════════════════════════════════════ */
  const staff = {
    async list(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return get('/staff' + (qs ? '?' + qs : ''));
    },
    async updateStatus(id, status) { return patch('/staff/' + id + '/status', { status }); },
    async updateProfile(data)      { return patch('/staff/me', data); },
    async changePassword(data)     { return patch('/staff/me/password', data); },
    async tasksSummary()           { return get('/staff/tasks-summary'); },
    async calendarEvents(start, end) {
      const qs = new URLSearchParams({ start, end }).toString();
      return get('/staff/calendar-events?' + qs);
    },
  };

  /* ══════════════════════════════════════════
     ADMIN
  ══════════════════════════════════════════ */
  const admin = {
    async stats()                  { return get('/admin/stats'); },
    async dashboardCharts()        { return get('/admin/dashboard-charts'); },
    async schools()                { return get('/admin/schools'); },
    async audit(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return get('/admin/audit' + (qs ? '?' + qs : ''));
    },

    // Notices
    async getNotices()             { return get('/admin/notices'); },
    async postNotice(data)         { return post('/admin/notices', data); },
    async deleteNotice(id)         { return del('/admin/notices/' + id); },
    async getNoticeStats(id)       { return get('/admin/notices/' + id + '/stats'); },
    async getNoticesAnalytics()    { return get('/admin/notices/analytics'); },
    async markNoticeViewed(id)     { return post('/admin/notices/' + id + '/view', {}); },

    // Deadlines
    async getDeadlines()           { return get('/admin/deadlines'); },
    async postDeadline(data)       { return post('/admin/deadlines', data); },
    async deleteDeadline(id)       { return del('/admin/deadlines/' + id); },

    // Profile
    async updateProfile(data)      { return patch('/admin/profile', data); },
    async changePassword(data)     { return patch('/admin/password', data); },
    async getValidationRules()     { return get('/admin/validation-rules'); },
    async saveValidationRule(data) { return post('/admin/validation-rules', data); },
  };

  /* ══════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════ */
  function getDaysUntil(dateStr) {
    const now = new Date(); now.setHours(0,0,0,0);
    const due = new Date(dateStr); due.setHours(0,0,0,0);
    return Math.ceil((due - now) / 86400000);
  }

  function exportToCSV(rows, headers, filename) {
    const esc  = v => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = [headers.map(esc).join(',')];
    rows.forEach(r => lines.push(r.map(esc).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function timeAgo(iso) {
    const d = Date.now() - new Date(iso).getTime(), m = Math.floor(d / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function levelLabel(l) {
    return { kindergarten:'Kindergarten', elementary:'Elementary',
             junior:'Junior High School', senior:'Senior High School' }[l] || l || '';
  }

  function statusPill(s) {
    const m = { review:['Under Review','pill-review'], approved:['Approved','pill-approved'],
                returned:['Returned','pill-returned'], received:['Received','pill-received'] };
    const [label, cls] = m[s] || ['Unknown',''];
    return '<span class="pill ' + cls + '">' + label + '</span>';
  }

  function showToast(message, type) {
    type = type || '';
    const ex = document.querySelector('.toast'); if (ex) ex.remove();
    const t  = document.createElement('div'); t.className = 'toast ' + type;
    const ic = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    t.innerHTML = '<i class="fas ' + ic + '"></i> ' + escapeHtml(message);
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.4s'; setTimeout(() => t.remove(), 400); }, 4000);
  }

  return { auth, submissions, notifications, staff, admin,
           getDaysUntil, exportToCSV, timeAgo, escapeHtml, levelLabel, statusPill, showToast };
})();
