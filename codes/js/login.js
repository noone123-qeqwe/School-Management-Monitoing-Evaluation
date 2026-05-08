/* ===== REDIRECT IF ALREADY LOGGED IN ===== */
// NOTE: API.auth uses sessionStorage, which is cleared on tab close AND on
// page refresh (via the clearSessionOnReload() IIFE in api.js). This means
// a refresh will always wipe the token before this listener runs, so the
// user will always land on the login page after a refresh — which is the
// intended behaviour.
window.addEventListener('load', async () => {
  if (!API.auth.isLoggedIn()) return; // No token in sessionStorage — show login

  try {
    // Verify the token is still valid server-side
    const user = await API.auth.verifySession();
    if (!user) return; // Token was invalid — verifySession() already cleared it

    // Token is valid — redirect to the appropriate dashboard
    window.location.href = user.role === 'admin'
      ? '/pages/admin-dashboard.html'
      : '/pages/school-dashboard.html';
  } catch (err) {
    // Network error or server issue — stay on login page
  }
});

/* ===== SEARCHABLE SCHOOL DROPDOWN ===== */
let _allSchools = [];

async function loadSchools() {
  if (_allSchools.length) return _allSchools;
  try {
    _allSchools = await API.auth.getSchools();
  } catch (e) {}
  return _allSchools;
}

function buildSearchableDropdown(selectId, schools) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const wrap = select.closest('.input-icon-wrap') || select.parentElement;

  // Build custom dropdown HTML
  const dropId = selectId + '_drop';
  const inputId = selectId + '_search';

  // Remove old custom dropdown if exists
  const old = document.getElementById(dropId);
  if (old) old.remove();

  // Hide the original select
  select.style.display = 'none';

  // Create wrapper
  const container = document.createElement('div');
  container.className = 'school-search-wrap';
  container.id = dropId;
  container.innerHTML = `
    <div class="school-search-input-wrap">
      <i class="fas fa-search school-search-icon"></i>
      <input type="text" id="${inputId}" class="school-search-input" placeholder="Search school..." autocomplete="off" />
      <span class="school-search-clear" id="${selectId}_clear" hidden>&#x2715;</span>
    </div>
    <div class="school-search-list" id="${selectId}_list" hidden></div>
    <div class="school-search-selected" id="${selectId}_selected">
      <span id="${selectId}_label" style="color:var(--text-muted)">-- Select your school --</span>
    </div>
  `;
  wrap.appendChild(container);

  const searchInput = document.getElementById(inputId);
  const listEl      = document.getElementById(selectId + '_list');
  const selectedEl  = document.getElementById(selectId + '_selected');
  const labelEl     = document.getElementById(selectId + '_label');
  const clearEl     = document.getElementById(selectId + '_clear');

  function renderList(filter) {
    const q = (filter || '').toLowerCase();
    const filtered = schools.filter(s => s.name.toLowerCase().includes(q));
    listEl.innerHTML = filtered.length
      ? filtered.map(s =>
          '<div class="school-option" data-id="' + s.id + '" data-name="' + API.escapeHtml(s.name) + '">' +
          '<span class="school-option-name">' + API.escapeHtml(s.name) + '</span>' +
          '<span class="school-option-level">' + API.levelLabel(s.level) + '</span>' +
          '</div>'
        ).join('')
      : '<div class="school-option-empty">No schools found</div>';

    listEl.querySelectorAll('.school-option').forEach(opt => {
      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        const id   = opt.dataset.id;
        const name = opt.dataset.name;
        select.value = id;
        labelEl.textContent = name;
        labelEl.style.color = 'var(--text)';
        clearEl.removeAttribute('hidden');
        listEl.setAttribute('hidden', '');
        searchInput.value = '';
        // Trigger change event
        select.dispatchEvent(new Event('change'));
      });
    });
  }

  // Show list on focus
  searchInput.addEventListener('focus', () => {
    renderList('');
    listEl.removeAttribute('hidden');
  });

  searchInput.addEventListener('input', () => {
    renderList(searchInput.value);
    listEl.removeAttribute('hidden');
  });

  searchInput.addEventListener('blur', () => {
    setTimeout(() => listEl.setAttribute('hidden', ''), 150);
  });

  // Click selected area to re-open
  selectedEl.addEventListener('click', () => {
    renderList('');
    listEl.removeAttribute('hidden');
    searchInput.focus();
  });

  // Clear selection
  clearEl.addEventListener('click', e => {
    e.stopPropagation();
    select.value = '';
    labelEl.textContent = '-- Select your school --';
    labelEl.style.color = 'var(--text-muted)';
    clearEl.setAttribute('hidden', '');
    searchInput.value = '';
  });
}

async function initSchoolDropdowns() {
  const schools = await loadSchools();
  ['staffSchool', 'regSchool'].forEach(id => {
    buildSearchableDropdown(id, schools);
  });
}

/* ===== PANEL SWITCHING ===== */
const roleSelector     = document.getElementById('roleSelector');
const schoolLoginPanel = document.getElementById('schoolLoginPanel');
const adminLoginPanel  = document.getElementById('adminLoginPanel');
const registerPanel    = document.getElementById('registerPanel');

function showPanel(panel) {
  [roleSelector, schoolLoginPanel, adminLoginPanel, registerPanel]
    .forEach(p => p.setAttribute('hidden', ''));
  panel.removeAttribute('hidden');
}

document.getElementById('roleSchool').addEventListener('click', async () => {
  showPanel(schoolLoginPanel);
  await initSchoolDropdowns();
});

document.getElementById('roleAdmin').addEventListener('click',  () => showPanel(adminLoginPanel));
document.getElementById('registerLink').addEventListener('click', async e => {
  e.preventDefault();
  showPanel(registerPanel);
  await initSchoolDropdowns();
});
document.getElementById('backFromSchool').addEventListener('click',   () => showPanel(roleSelector));
document.getElementById('backFromAdmin').addEventListener('click',    () => showPanel(roleSelector));
document.getElementById('backFromRegister').addEventListener('click', () => showPanel(schoolLoginPanel));

/* ===== PASSWORD TOGGLE ===== */
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  });
});

/* ===== HELPERS ===== */
function setError(inputId, errId, msg) {
  const el = document.getElementById(inputId), err = document.getElementById(errId);
  if (el)  el.classList.add('invalid');
  if (err) err.textContent = msg;
}
function clearError(inputId, errId) {
  const el = document.getElementById(inputId), err = document.getElementById(errId);
  if (el)  el.classList.remove('invalid');
  if (err) err.textContent = '';
}
function showLoginError(formId, message) {
  let alert = document.getElementById(formId + 'Alert');
  if (!alert) {
    alert = document.createElement('div');
    alert.id = formId + 'Alert';
    alert.className = 'login-alert';
    document.getElementById(formId).prepend(alert);
  }
  alert.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + API.escapeHtml(message);
  alert.style.display = 'flex';
}
function clearLoginError(formId) {
  const alert = document.getElementById(formId + 'Alert');
  if (alert) alert.style.display = 'none';
}

// Inject alert style
const alertStyle = document.createElement('style');
alertStyle.textContent = `.login-alert{display:flex;align-items:center;gap:8px;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;border-radius:8px;padding:10px 14px;font-size:.85rem;font-weight:500;margin-bottom:12px}`;
document.head.appendChild(alertStyle);

/* ===== SCHOOL STAFF LOGIN ===== */
document.getElementById('schoolLoginForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearLoginError('schoolLoginForm');

  const schoolId = document.getElementById('staffSchool').value;
  const email    = document.getElementById('schoolEmail').value.trim();
  const password = document.getElementById('schoolPassword').value;
  let valid = true;

  clearError('staffSchool',    'staffSchoolErr');
  clearError('schoolEmail',    'schoolEmailErr');
  clearError('schoolPassword', 'schoolPasswordErr');

  if (!schoolId) { setError('staffSchool',    'staffSchoolErr',    'Please select your school.');  valid = false; }
  if (!email)    { setError('schoolEmail',    'schoolEmailErr',    'Email is required.');           valid = false; }
  if (!password) { setError('schoolPassword', 'schoolPasswordErr', 'Password is required.');        valid = false; }
  if (!valid) return;

  const btn = document.getElementById('schoolLoginBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

  try {
    await API.auth.loginStaff(schoolId, email, password);
    window.location.href = '/pages/school-dashboard.html';
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    showLoginError('schoolLoginForm', err.message);
  }
});

document.getElementById('staffSchool').addEventListener('change',   () => clearError('staffSchool',    'staffSchoolErr'));
document.getElementById('schoolEmail').addEventListener('input',    () => clearError('schoolEmail',    'schoolEmailErr'));
document.getElementById('schoolPassword').addEventListener('input', () => clearError('schoolPassword', 'schoolPasswordErr'));

/* ===== ADMIN LOGIN ===== */
document.getElementById('adminLoginForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearLoginError('adminLoginForm');

  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  let valid = true;

  clearError('adminUsername', 'adminUsernameErr');
  clearError('adminPassword', 'adminPasswordErr');

  if (!username) { setError('adminUsername', 'adminUsernameErr', 'Username is required.'); valid = false; }
  if (!password) { setError('adminPassword', 'adminPasswordErr', 'Password is required.'); valid = false; }
  if (!valid) return;

  const btn = document.getElementById('adminLoginBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

  try {
    await API.auth.loginAdmin(username, password);
    window.location.href = '/pages/admin-dashboard.html';
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In as Admin';
    showLoginError('adminLoginForm', err.message);
  }
});

document.getElementById('adminUsername').addEventListener('input', () => clearError('adminUsername', 'adminUsernameErr'));
document.getElementById('adminPassword').addEventListener('input', () => clearError('adminPassword', 'adminPasswordErr'));

/* ===== STAFF REGISTRATION ===== */
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();

  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName  = document.getElementById('regLastName').value.trim();
  const position  = document.getElementById('regPosition').value;
  const schoolId  = document.getElementById('regSchool').value;
  const email     = document.getElementById('regEmail').value.trim();
  const pw        = document.getElementById('regPassword').value;
  const confirm   = document.getElementById('regConfirm').value;
  const terms     = document.getElementById('regTerms').checked;
  let valid = true;

  const checks = [
    ['regFirstName','regFirstNameErr', !firstName,  'First name is required.'],
    ['regLastName', 'regLastNameErr',  !lastName,   'Last name is required.'],
    ['regPosition', 'regPositionErr',  !position,   'Please select your position.'],
    ['regSchool',   'regSchoolErr',    !schoolId,   'Please select your school.'],
    ['regEmail',    'regEmailErr',     !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'A valid email is required.'],
    ['regPassword', 'regPasswordErr',  pw.length < 8, 'Password must be at least 8 characters.'],
    ['regConfirm',  'regConfirmErr',   pw !== confirm, 'Passwords do not match.'],
  ];
  checks.forEach(([id, errId, cond, msg]) => {
    if (cond) { setError(id, errId, msg); valid = false; }
    else clearError(id, errId);
  });

  const termsErr = document.getElementById('regTermsErr');
  if (!terms) { termsErr.textContent = 'You must agree to the terms.'; valid = false; }
  else termsErr.textContent = '';

  if (!valid) return;

  const btn = document.querySelector('#registerForm button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

  try {
    await API.auth.register({ firstName, lastName, position, schoolId, email, password: pw });
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    document.getElementById('registerForm').reset();
    showPanel(schoolLoginPanel);

    // Pre-fill school selector
    document.getElementById('staffSchool').value = schoolId;
    document.getElementById('schoolEmail').value = email;

    const msg = document.createElement('div');
    msg.style.cssText = 'background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;border-radius:8px;padding:12px 16px;font-size:.85rem;font-weight:500;margin-bottom:16px;display:flex;align-items:center;gap:8px';
    msg.innerHTML = '<i class="fas fa-check-circle"></i> Account created for <strong>' + API.escapeHtml(firstName + ' ' + lastName) + '</strong>! Awaiting Division Office approval.';
    schoolLoginPanel.querySelector('form').prepend(msg);
    setTimeout(() => msg.remove(), 7000);
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    showLoginError('registerForm', err.message);
  }
});