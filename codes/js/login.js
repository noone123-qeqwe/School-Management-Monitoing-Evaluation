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
      ? '/html/admin-dashboard.html'
      : '/html/school-dashboard.html';
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

  // Prevent duplicate initialization
  if (document.getElementById(selectId + '_search')) return;

  const formGroup = select.closest('.form-group');
  const iconWrap  = select.closest('.input-icon-wrap');

  // Hide the native select — it stays as the value source
  select.style.display = 'none';
  // Also hide the school icon inside the wrap (we'll add our own)
  if (iconWrap) {
    const existingIcon = iconWrap.querySelector('i:first-child');
    if (existingIcon) existingIcon.style.display = 'none';
  }

  // Build the entire custom dropdown as a sibling of input-icon-wrap
  const wrapper = document.createElement('div');
  wrapper.className = 'school-dropdown-wrap';
  wrapper.id = selectId + '_drop';
  wrapper.innerHTML =
    '<div class="school-dropdown-field" id="' + selectId + '_field">' +
      '<i class="fas fa-school school-dropdown-icon"></i>' +
      '<input type="text" id="' + selectId + '_search" class="school-dropdown-input"' +
        ' placeholder="Search school..." autocomplete="off" />' +
      '<button type="button" class="school-dropdown-clear" id="' + selectId + '_clear"' +
        ' hidden aria-label="Clear selection">&#x2715;</button>' +
    '</div>' +
    '<div class="school-dropdown-list" id="' + selectId + '_list" hidden></div>';

  // Insert right after the input-icon-wrap (or after the select if no wrap)
  const anchor = iconWrap || select;
  anchor.insertAdjacentElement('afterend', wrapper);

  const field     = document.getElementById(selectId + '_field');
  const searchEl  = document.getElementById(selectId + '_search');
  const listEl    = document.getElementById(selectId + '_list');
  const clearEl   = document.getElementById(selectId + '_clear');
  const errEl     = document.getElementById(selectId + 'Err');

  function renderList(filter) {
    const q = (filter || '').toLowerCase().trim();
    const filtered = schools.filter(s => s.name.toLowerCase().includes(q));
    listEl.innerHTML = filtered.length
      ? filtered.map(s =>
          '<div class="school-option" data-id="' + s.id + '" data-name="' + API.escapeHtml(s.name) + '">' +
            '<span class="school-option-name">' + API.escapeHtml(s.name) + '</span>' +
            '<span class="school-option-level">' + API.levelLabel(s.level) + '</span>' +
          '</div>'
        ).join('')
      : '<div class="school-option-empty"><i class="fas fa-search"></i> No schools found</div>';

    listEl.querySelectorAll('.school-option').forEach(opt => {
      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        select.value      = opt.dataset.id;
        searchEl.value    = opt.dataset.name;
        clearEl.hidden    = false;
        listEl.hidden     = true;
        field.classList.remove('focused', 'invalid');
        if (errEl) errEl.textContent = '';
        select.dispatchEvent(new Event('change'));
      });
    });
  }

  searchEl.addEventListener('focus', () => {
    field.classList.add('focused');
    renderList(searchEl.value);
    listEl.hidden = false;
  });

  searchEl.addEventListener('input', () => {
    select.value   = '';
    clearEl.hidden = searchEl.value.length === 0;
    renderList(searchEl.value);
    listEl.hidden  = false;
  });

  searchEl.addEventListener('blur', () => {
    setTimeout(() => {
      field.classList.remove('focused');
      listEl.hidden = true;
      // If user typed but didn't pick, revert display to last valid selection
      if (!select.value) {
        searchEl.value = '';
        clearEl.hidden = true;
      } else {
        const matched = schools.find(s => String(s.id) === String(select.value));
        if (matched) searchEl.value = matched.name;
      }
    }, 180);
  });

  clearEl.addEventListener('click', e => {
    e.stopPropagation();
    select.value   = '';
    searchEl.value = '';
    clearEl.hidden = true;
    searchEl.focus();
    select.dispatchEvent(new Event('change'));
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
  // For school dropdowns, mark the custom field wrapper
  const field = document.getElementById(inputId + '_field');
  const el    = document.getElementById(inputId);
  const err   = document.getElementById(errId);
  if (field) field.classList.add('invalid');
  else if (el) el.classList.add('invalid');
  if (err) err.textContent = msg;
}
function clearError(inputId, errId) {
  const field = document.getElementById(inputId + '_field');
  const el    = document.getElementById(inputId);
  const err   = document.getElementById(errId);
  if (field) field.classList.remove('invalid');
  else if (el) el.classList.remove('invalid');
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
    window.location.href = '/html/school-dashboard.html';
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
    window.location.href = '/html/admin-dashboard.html';
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