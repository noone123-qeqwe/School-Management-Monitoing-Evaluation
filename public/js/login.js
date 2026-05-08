/* ===== REDIRECT IF ALREADY LOGGED IN ===== */
window.addEventListener('load', async () => {
  if (!API.auth.isLoggedIn()) return;
  const user = API.auth.getUser();
  if (user) {
    window.location.href = user.role === 'admin'
      ? '/pages/admin-dashboard.html'
      : '/pages/school-dashboard.html';
  }

  // Populate school dropdown from API
  try {
    const schools = await API.auth.getSchools();
    const selectors = ['staffSchool', 'regSchool'];
    selectors.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">-- Select your school --</option>' +
        schools.map(s =>
          '<option value="' + s.id + '">' +
          API.escapeHtml(s.name) + ' (' + API.levelLabel(s.level) + ')' +
          '</option>'
        ).join('');
    });
  } catch (e) { /* schools dropdown stays empty if API unreachable */ }
});

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
  // Load schools when panel opens
  try {
    const schools = await API.auth.getSchools();
    ['staffSchool', 'regSchool'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">-- Select your school --</option>' +
        schools.map(s =>
          '<option value="' + s.id + '">' +
          API.escapeHtml(s.name) + ' (' + API.levelLabel(s.level) + ')' +
          '</option>'
        ).join('');
    });
  } catch {}
});

document.getElementById('roleAdmin').addEventListener('click',  () => showPanel(adminLoginPanel));
document.getElementById('registerLink').addEventListener('click', e => { e.preventDefault(); showPanel(registerPanel); });
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
alertStyle.textContent = `.login-alert{display:flex;align-items:center;gap:8px;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;border-radius:8px;padding:10px 14px;font-size:.85rem;font-weight:500;margin-bottom:16px}`;
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
