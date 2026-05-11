'use strict';
/**
 * SMME Portal — Login Page Controller (fixed)
 */

/* ═══════════════════════════════════════════
   SPLASH SCREEN
═══════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splashHero');
  const layout = document.getElementById('authLayout');

  setTimeout(() => {
    if (splash) {
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
    }
    if (layout) layout.classList.add('layout-in');
  }, 2000);

  loadSchools();

  const params = new URLSearchParams(window.location.search);
  if (params.get('logout') === '1') {
    showToast('You have been logged out.', 'info');
  }

  // If already logged in, redirect
  const user = API.auth.getUser();
  if (user && API.auth.isLoggedIn()) {
    if (user.role === 'admin') window.location.href = '/html/admin-dashboard.html';
    else if (user.role === 'staff') window.location.href = '/html/school-dashboard.html';
  }
});

/* ═══════════════════════════════════════════
   STEP MANAGEMENT
   IDs must match login.html exactly:
     stepRole | stepStaff | stepAdmin | stepRegister
═══════════════════════════════════════════ */
function showStep(stepId) {
  document.querySelectorAll('.auth-step').forEach(s => s.setAttribute('hidden', ''));
  const el = document.getElementById(stepId);
  if (el) el.removeAttribute('hidden');
}

// Role selection buttons — IDs from login.html: roleSchool, roleAdmin
const roleSchoolBtn = document.getElementById('roleSchool');
const roleAdminBtn = document.getElementById('roleAdmin');

if (roleSchoolBtn) roleSchoolBtn.addEventListener('click', () => showStep('stepStaff'));
if (roleAdminBtn) roleAdminBtn.addEventListener('click', () => showStep('stepAdmin'));

// Back buttons
document.getElementById('backFromStaff')?.addEventListener('click', () => showStep('stepRole'));
document.getElementById('backFromAdmin')?.addEventListener('click', () => showStep('stepRole'));
document.getElementById('backFromRegister')?.addEventListener('click', () => showStep('stepStaff'));

// "Create an account" link inside staff step — id="registerLink"
document.getElementById('registerLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  showStep('stepRegister');
});

/* ═══════════════════════════════════════════
   SCHOOL PICKER (dropdown for staff login + register)
   login.html uses: <select id="staffSchool"> and <select id="regSchool">
   Both are hidden; we build a custom search picker on top of them.
═══════════════════════════════════════════ */
let allSchools = [];

async function loadSchools() {
  try {
    allSchools = await API.auth.getSchools();
    buildPicker('staffSchoolGroup', 'staffSchool', 'staffSchoolErr');
    buildPicker('regSchoolGroup', 'regSchool', 'regSchoolErr');
    // Also fill the real selects for form submission fallback
    populateSelect('staffSchool');
    populateSelect('regSchool');
  } catch (err) {
    console.error('Failed to load schools:', err.message);
  }
}

function populateSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Select your school --</option>' +
    allSchools.map(s =>
      `<option value="${s.id}">${escHtml(s.name)} (${levelLabel(s.level)})</option>`
    ).join('');
}

/**
 * Build a search-picker UI inside `groupId`, replacing the hidden select.
 * Keeps the real <select> in sync so form validation works.
 */
function buildPicker(groupId, selectId, errId) {
  const group = document.getElementById(groupId);
  if (!group) return;

  // Remove any previously injected picker
  group.querySelectorAll('.sp-wrap').forEach(el => el.remove());

  const wrap = document.createElement('div');
  wrap.className = 'school-picker sp-wrap';

  const field = document.createElement('div');
  field.className = 'school-picker-field';

  const iconEl = document.createElement('i');
  iconEl.className = 'fas fa-school school-picker-icon';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'school-picker-input';
  input.placeholder = 'Search your school…';
  input.autocomplete = 'off';

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'school-picker-clear';
  clearBtn.innerHTML = '&times;';
  clearBtn.style.display = 'none';

  const list = document.createElement('ul');
  list.className = 'school-picker-list';
  list.style.display = 'none';

  field.append(iconEl, input, clearBtn);
  wrap.append(field, list);
  group.appendChild(wrap);

  function render(query) {
    const q = (query || '').toLowerCase();
    const filtered = q
      ? allSchools.filter(s => s.name.toLowerCase().includes(q) || (s.school_code || '').toLowerCase().includes(q))
      : allSchools;
    if (!filtered.length) {
      list.innerHTML = `<li class="sp-empty"><i class="fas fa-search"></i> No schools found.</li>`;
    } else {
      list.innerHTML = filtered.map(s =>
        `<li class="sp-option" data-id="${s.id}" data-name="${escHtml(s.name)}">
          <span class="sp-option-name">${escHtml(s.name)}</span>
          <span class="sp-option-level">${levelLabel(s.level)}</span>
        </li>`
      ).join('');
      list.querySelectorAll('.sp-option').forEach(opt => {
        opt.addEventListener('mousedown', () => {
          input.value = opt.dataset.name;
          setSelect(selectId, opt.dataset.id);
          list.style.display = 'none';
          field.classList.remove('invalid');
          clearBtn.style.display = 'inline-flex';
          clearErr(errId);
        });
      });
    }
    list.style.display = 'block';
  }

  input.addEventListener('input', () => { render(input.value); setSelect(selectId, ''); });
  input.addEventListener('focus', () => { field.classList.add('focused'); render(input.value); });
  input.addEventListener('blur', () => {
    field.classList.remove('focused');
    setTimeout(() => { list.style.display = 'none'; }, 200);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    setSelect(selectId, '');
    list.style.display = 'none';
    clearBtn.style.display = 'none';
    field.classList.remove('invalid');
  });
}

function setSelect(selectId, value) {
  const sel = document.getElementById(selectId);
  if (sel) sel.value = value;
}

function getSelectValue(selectId) {
  const sel = document.getElementById(selectId);
  return sel ? sel.value : '';
}

/* ═══════════════════════════════════════════
   PASSWORD VISIBILITY TOGGLES
═══════════════════════════════════════════ */
document.querySelectorAll('.field-eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    const icon = btn.querySelector('i');
    if (icon) icon.className = isText ? 'fas fa-eye' : 'fas fa-eye-slash';
  });
});

/* ═══════════════════════════════════════════
   PASSWORD STRENGTH METER (Register)
═══════════════════════════════════════════ */
const regPasswordInput = document.getElementById('regPassword');
if (regPasswordInput) {
  regPasswordInput.addEventListener('input', () => {
    const score = getPasswordScore(regPasswordInput.value);
    const strengthWrap = document.getElementById('pwStrength');
    if (strengthWrap) strengthWrap.removeAttribute('hidden');
    updateStrengthMeter(score);
  });
}

function getPasswordScore(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

function updateStrengthMeter(score) {
  const bars = document.querySelectorAll('.pw-bar');
  const label = document.getElementById('pwStrengthLabel');
  const levels = ['', 'weak', 'fair', 'good', 'strong'];
  const names = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  bars.forEach((bar, i) => {
    bar.className = 'pw-bar';
    if (i < score) bar.classList.add(`active-${levels[score]}`);
  });
  if (label) {
    label.textContent = score > 0 ? names[score] : '';
    label.className = `pw-strength-label ${levels[score]}`;
  }
}

/* ═══════════════════════════════════════════
   STAFF LOGIN  — form id="schoolLoginForm"
═══════════════════════════════════════════ */
const schoolLoginForm = document.getElementById('schoolLoginForm');
if (schoolLoginForm) {
  schoolLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearInlineErrors(['schoolEmailErr', 'schoolPasswordErr', 'staffSchoolErr']);

    const schoolId = getSelectValue('staffSchool');
    const email = document.getElementById('schoolEmail').value.trim().toLowerCase();
    const password = document.getElementById('schoolPassword').value;

    let valid = true;
    if (!schoolId) {
      setErr('staffSchoolErr', 'Please select your school.');
      document.querySelector('#staffSchoolGroup .school-picker-field')?.classList.add('invalid');
      valid = false;
    }
    if (!email) { setErr('schoolEmailErr', 'Email is required.'); valid = false; }
    if (!password) { setErr('schoolPasswordErr', 'Password is required.'); valid = false; }
    if (!valid) return;

    const btn = document.getElementById('schoolLoginBtn');
    setLoading(btn, true);

    try {
      await API.auth.loginStaff(schoolId, email, password);
      showToast('Login successful!', 'success');
      setTimeout(() => { window.location.href = '/html/school-dashboard.html'; }, 500);
    } catch (err) {
      showToast(err.message || 'Invalid credentials. Please try again.', 'error');
      setLoading(btn, false);
    }
  });
}

/* ═══════════════════════════════════════════
   ADMIN LOGIN  — form id="adminLoginForm"
═══════════════════════════════════════════ */
const adminLoginForm = document.getElementById('adminLoginForm');
if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearInlineErrors(['adminUsernameErr', 'adminPasswordErr']);

    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;

    let valid = true;
    if (!username) { setErr('adminUsernameErr', 'Username is required.'); valid = false; }
    if (!password) { setErr('adminPasswordErr', 'Password is required.'); valid = false; }
    if (!valid) return;

    const btn = document.getElementById('adminLoginBtn');
    setLoading(btn, true);

    try {
      const user = await API.auth.loginAdmin(username, password);
      showToast('Welcome, ' + user.name + '!', 'success');
      setTimeout(() => { window.location.href = '/html/admin-dashboard.html'; }, 500);
    } catch (err) {
      showToast(err.message || 'Invalid credentials. Please try again.', 'error');
      setLoading(btn, false);
    }
  });
}

/* ═══════════════════════════════════════════
   STAFF REGISTRATION  — form id="registerForm"
═══════════════════════════════════════════ */
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearInlineErrors([
      'regFirstNameErr', 'regLastNameErr', 'regPositionErr',
      'regSchoolErr', 'regEmailErr', 'regPasswordErr', 'regConfirmErr', 'regTermsErr'
    ]);

    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const position = document.getElementById('regPosition').value;
    const schoolId = getSelectValue('regSchool');
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    const terms = document.getElementById('regTerms')?.checked;

    let valid = true;
    if (!firstName) { setErr('regFirstNameErr', 'First name is required.'); valid = false; }
    if (!lastName) { setErr('regLastNameErr', 'Last name is required.'); valid = false; }
    if (!position) { setErr('regPositionErr', 'Please select your position.'); valid = false; }
    if (!schoolId) { setErr('regSchoolErr', 'Please select your school.'); valid = false; }
    if (!email) { setErr('regEmailErr', 'Email is required.'); valid = false; }
    if (password.length < 8) { setErr('regPasswordErr', 'Password must be at least 8 characters.'); valid = false; }
    if (password !== confirm) { setErr('regConfirmErr', 'Passwords do not match.'); valid = false; }
    if (!terms) { setErr('regTermsErr', 'You must accept the terms.'); valid = false; }
    if (!valid) return;

    const btn = registerForm.querySelector('button[type="submit"]');
    setLoading(btn, true);

    try {
      await API.auth.register({ firstName, lastName, position, schoolId, email, password });
      showToast('Account created! Awaiting admin approval before you can log in.', 'success');
      // Go back to staff login step
      setTimeout(() => showStep('stepStaff'), 1800);
    } catch (err) {
      showToast(err.message || 'Registration failed. Please try again.', 'error');
      setLoading(btn, false);
    }
  });
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearErr(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}

function clearInlineErrors(ids) {
  ids.forEach(clearErr);
}

/**
 * @param {HTMLButtonElement} btn
 * @param {boolean} loading
 */
function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  const icon = loading ? 'fa-spinner fa-spin' : 'fa-arrow-right-to-bracket';
  btn.innerHTML = `<i class="fas ${icon}"></i> ${loading ? 'Please wait…' : 'Sign In'}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function levelLabel(l) {
  return { kindergarten: 'Kinder', elementary: 'Elementary', junior: 'Junior HS', senior: 'Senior HS' }[l] || l || '';
}

function showToast(message, type) {
  const ex = document.querySelector('.toast');
  if (ex) ex.remove();
  const t = document.createElement('div');
  t.className = `toast ${type || ''}`;
  const ic = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
  t.innerHTML = `<i class="fas ${ic}"></i> ${escHtml(message)}`;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity .4s';
    setTimeout(() => t.remove(), 400);
  }, 4000);
}