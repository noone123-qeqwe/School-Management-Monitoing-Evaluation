/**
 * SMME Portal – API Client
 * Replaces all localStorage calls with real HTTP requests to the Express backend.
 * Token is stored in localStorage under 'smme_token'.
 */

const API = (() => {
  const BASE = '/api';

  /* ── Token management ── */
  function getToken()        { return localStorage.getItem('smme_token'); }
  function setToken(t)       { localStorage.setItem('smme_token', t); }
  function clearToken()      { localStorage.removeItem('smme_token'); localStorage.removeItem('smme_user'); }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('smme_user') || 'null'); }
    catch { return null; }
  }
  function setUser(u) { localStorage.setItem('smme_user', JSON.stringify(u)); }

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
    async loginStaff(schoolId, email, password) {
      const data = await post('/auth/staff/login', { schoolId, email, password });
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
      window.location.href = '/login.html';
    },

    getUser,

    isLoggedIn() { return !!getToken(); },
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

    async review(ref, action, feedback) {
      return patch('/submissions/' + ref + '/review', { action, feedback });
    },

    async downloadFileUrl(ref, fileId) {
      return BASE + '/submissions/' + ref + '/files/' + fileId + '?token=' + getToken();
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
  };

  /* ══════════════════════════════════════════
     ADMIN
  ══════════════════════════════════════════ */
  const admin = {
    async stats()                  { return get('/admin/stats'); },
    async schools()                { return get('/admin/schools'); },
    async audit(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return get('/admin/audit' + (qs ? '?' + qs : ''));
    },

    // Notices
    async getNotices()             { return get('/admin/notices'); },
    async postNotice(data)         { return post('/admin/notices', data); },
    async deleteNotice(id)         { return del('/admin/notices/' + id); },

    // Deadlines
    async getDeadlines()           { return get('/admin/deadlines'); },
    async postDeadline(data)       { return post('/admin/deadlines', data); },
    async deleteDeadline(id)       { return del('/admin/deadlines/' + id); },

    // Profile
    async updateProfile(data)      { return patch('/admin/profile', data); },
    async changePassword(data)     { return patch('/admin/password', data); },
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
