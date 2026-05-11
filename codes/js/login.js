'use strict';
/**
 * SMME Portal — Login Page Controller
 * Handles role selection, staff login, admin login, and registration.
 */

/* ═══════════════════════════════════════════
   SPLASH SCREEN
═══════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splashHero');
  const layout = document.getElementById('authLayout');

  // Hide splash after 2 seconds, reveal layout
  setTimeout(() => {
    if (splash) {
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
    }
    if (layout) layout.classList.add('layout-in');
  }, 2000);

  // Load schools for staff login dropdown
  loadSchools();

  // Check if redirected after logout
  const params = new URLSearchParams(window.location.search);
  if (params.get('logout') === '1') {
    showToast('You have been logged out.', 'info');
  }

  // If already logged in, redirect to appropriate dashboard
  const user = API.auth.getUser();
  if (user && API.auth.isLoggedIn()) {
    if (user.role === 'admin') {
      window.location.href = '/html/admin-dashboard.html';
    } else if (user.role === 'staff') {
      window.location.href = '/html/school-dashboard.html';
    }
  }
});

/* ═══════════════════════════════════════════
   STEP MANAGEMENT
═══════════════════════════════════════════ */
function showStep(stepId) {
  document.querySelectorAll('.auth-step').forEach(s => s.setAttribute('hidden', ''));
  const el = document.getElementById(stepId);
  if (el) el.removeAttribute('hidden');
}

// Role selection buttons
const roleStaffBtn = document.getElementById('roleStaff');
const roleAdminBtn = document.getElementById('roleAdmin');

if (roleStaffBtn) {
  roleStaffBtn.addEventListener('click', () => showStep('stepStaffLogin'));
}
if (roleAdminBtn) {
  roleAdminBtn.addEventListener('click', () => showStep('stepAdminLogin'));
}

// Back buttons
document.querySelectorAll('.auth-back').forEach(btn => {
  btn.addEventListener('click', () => showStep('stepRole'));
});

// "Register" link from staff login
const goRegisterBtn = document.getElementById('goRegister');
if (goRegisterBtn) {
  goRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showStep('stepRegister');
  });
}

// "Sign in" link from register
const goLoginBtn = document.getElementById('goLogin');
if (goLoginBtn) {
  goLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showStep('stepStaffLogin');
  });
}

/* ═══════════════════════════════════════════
   SCHOOL PICKER (Staff Login + Register)
═══════════════════════════════════════════ */
let allSchools = [];

async function loadSchools() {
  try {
    allSchools = await API.auth.getSchools();
    // Populate register school select if present
    const regSchool = document.getElementById('regSchoolId');
    if (regSchool) {
      regSchool.innerHTML = '<option value="">Select your school…</option>' +
        allSchools.map(s =>
          `<option value="${s.id}">${escHtml(s.name)} (${levelLabel(s.level)})</option>`
        ).join('');
    }
  } catch (err) {
    console.error('Failed to load schools:', err.message);
  }
}

// School search picker for staff login
const schoolPickerInput = document.getElementById('loginSchoolInput');
const schoolPickerList = document.getElementById('schoolPickerList');
const schoolPickerClear = document.getElementById('schoolPickerClear');
const schoolPickerField = document.getElementById('schoolPickerField');
let selectedSchoolId = '';

if (schoolPickerInput) {
  schoolPickerInput.addEventListener('input', () => {
    const q = schoolPickerInput.value.toLowerCase().trim();
    selectedSchoolId = '';
    renderSchoolPicker(q);
  });

  schoolPickerInput.addEventListener('focus', () => {
    schoolPickerField.classList.add('focused');
    renderSchoolPicker(schoolPickerInput.value.toLowerCase().trim());
  });

  schoolPickerInput.addEventListener('blur', () => {
    schoolPickerField.classList.remove('focused');
    // Delay to allow click on option
    setTimeout(() => {
      if (schoolPickerList) schoolPickerList.style.display = 'none';
    }, 200);
  });
}

if (schoolPickerClear) {
  schoolPickerClear.addEventListener('click', () => {
    selectedSchoolId = '';
    if (schoolPickerInput) schoolPickerInput.value = '';
    if (schoolPickerList) schoolPickerList.style.display = 'none';
    schoolPickerField.classList.remove('invalid');
  });
}

function renderSchoolPicker(query) {
  if (!schoolPickerList) return;
  const filtered = query
    ? allSchools.filter(s => s.name.toLowerCase().includes(query) || s.school_code.toLowerCase().includes(query))
    : allSchools;

  if (!filtered.length) {
    schoolPickerList.innerHTML = `<li class="sp-empty"><i class="fas fa-search"></i>No schools found.</li>`;
  } else {
    schoolPickerList.innerHTML = filtered.slice(0, 12).map(s => `
      <li class="sp-option" data-id="${s.id}" data-name="${escHtml(s.name)}">
        <span class="sp-option-name">${escHtml(s.name)}</span>
        <span class="sp-option-level">${levelLabel(s.level)}</span>
      </li>
    `).join('');
    schoolPickerList.querySelectorAll('.sp-option').forEach(opt => {
      opt.addEventListener('mousedown', () => {
        selectedSchoolId = opt.dataset.id;
        if (schoolPickerInput) schoolPickerInput.value = opt.dataset.name;
        schoolPickerList.style.display = 'none';
        schoolPickerField.classList.remove('invalid');
      });
    });
  }
  schoolPickerList.style.display = 'block';
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
    if (icon) {
      icon.className = isText ? 'fas fa-eye' : 'fas fa-eye-slash';
    }
  });
});

/* ═══════════════════════════════════════════
   PASSWORD STRENGTH METER (Register)
═══════════════════════════════════════════ */
const regPassword = document.getElementById('regPassword');
if (regPassword) {
  regPassword.addEventListener('input', () => {
    const pw = regPassword.value;
    const score = getPasswordScore(pw);
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
  const label = document.querySelector('.pw-strength-label');
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
   STAFF LOGIN
═══════════════════════════════════════════ */
const staffLoginForm = document.getElementById('staffLoginForm');
if (staffLoginForm) {
  staffLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert('staffLoginAlert');

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    // Validate school selection
    if (!selectedSchoolId) {
      schoolPickerField.classList.add('invalid');
      showAlert('staffLoginAlert', 'Please select your school from the list.');
      return;
    }

    const btn = document.getElementById('staffLoginBtn');
    setLoading(btn, true, 'Signing in…');

    try {
      const user = await API.auth.loginStaff(selectedSchoolId, email, password);
      showToast('Login successful!', 'success');
      setTimeout(() => {
        window.location.href = '/html/school-dashboard.html';
      }, 500);
    } catch (err) {
      showAlert('staffLoginAlert', err.message || 'Invalid credentials. Please try again.');
      setLoading(btn, false, '<i class="fas fa-sign-in-alt"></i> Sign In');
    }
  });
}

/* ═══════════════════════════════════════════
   ADMIN LOGIN
═══════════════════════════════════════════ */
const adminLoginForm = document.getElementById('adminLoginForm');
if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert('adminLoginAlert');

    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;

    if (!username || !password) {
      showAlert('adminLoginAlert', 'Username and password are required.');
      return;
    }

    const btn = document.getElementById('adminLoginBtn');
    setLoading(btn, true, 'Signing in…');

    try {
      const user = await API.auth.loginAdmin(username, password);
      showToast('Welcome, ' + user.name + '!', 'success');
      setTimeout(() => {
        window.location.href = '/html/admin-dashboard.html';
      }, 500);
    } catch (err) {
      showAlert('adminLoginAlert', err.message || 'Invalid credentials. Please try again.');
      setLoading(btn, false, '<i class="fas fa-shield-alt"></i> Admin Sign In');
    }
  });
}

/* ═══════════════════════════════════════════
   STAFF REGISTRATION
═══════════════════════════════════════════ */
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert('registerAlert');

    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const position = document.getElementById('regPosition').value;
    const schoolId = document.getElementById('regSchoolId').value;
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    const terms = document.getElementById('regTerms')?.checked;

    // Validations
    if (!firstName || !lastName) { showAlert('registerAlert', 'Please enter your full name.'); return; }
    if (!position) { showAlert('registerAlert', 'Please select your position.'); return; }
    if (!schoolId) { showAlert('registerAlert', 'Please select your school.'); return; }
    if (!email) { showAlert('registerAlert', 'Please enter your email address.'); return; }
    if (password.length < 8) { showAlert('registerAlert', 'Password must be at least 8 characters.'); return; }
    if (password !== confirm) { showAlert('registerAlert', 'Passwords do not match.'); return; }
    if (!terms) { showAlert('registerAlert', 'Please accept the terms and conditions.'); return; }

    const btn = document.getElementById('registerBtn');
    setLoading(btn, true, 'Creating account…');

    try {
      await API.auth.register({ firstName, lastName, position, schoolId, email, password });
      // Show success step
      showStep('stepRegisterSuccess');
    } catch (err) {
      showAlert('registerAlert', err.message || 'Registration failed. Please try again.');
      setLoading(btn, false, '<i class="fas fa-user-plus"></i> Create Account');
    }
  });
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function showAlert(containerId, message) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${escHtml(message)}`;
  el.removeAttribute('hidden');
}

function clearAlert(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  el.setAttribute('hidden', '');
}

function setLoading(btn, loading, html) {
  if (!btn) return;
  btn.disabled = loading;
  if (!loading) btn.innerHTML = html;
  else btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + html;
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
  const ex = document.querySelector('.toast'); if (ex) ex.remove();
  const t = document.createElement('div');
  t.className = `toast ${type || ''}`;
  const ic = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
  t.innerHTML = `<i class="fas ${ic}"></i> ${escHtml(message)}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 400); }, 4000);
}