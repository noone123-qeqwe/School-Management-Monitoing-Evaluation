/* ============================================================
   SMME PORTAL — LOGIN / AUTH  (v2.0)
   ============================================================ */

/* ── Auto-redirect if already logged in ── */
window.addEventListener('load', async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('logout') === '1') {
    sessionStorage.removeItem('smme_token');
    sessionStorage.removeItem('smme_user');
    history.replaceState(null, '', window.location.pathname);
    // Show layout immediately on logout
    document.getElementById('authLayout').classList.add('layout-in');
    return;
  }
  const user = await API.auth.verifySession();
  if (user) {
    window.location.href = user.role === 'admin'
      ? '/html/admin-dashboard.html'
      : '/html/school-dashboard.html';
  } else {
    // Trigger layout fade-in after splash hides
    setTimeout(() => {
      document.getElementById('authLayout').classList.add('layout-in');
    }, 1900);
  }
});

/* ── School data cache ── */
let _schools = [];
async function loadSchools() {
  if (_schools.length) return _schools;
  try { _schools = await API.auth.getSchools(); } catch (e) {}
  return _schools;
}

/* ── Build searchable school picker ──────────────────────────
   Injects a custom picker into .field-group[id=groupId].
   The hidden <select id=selectId> stays as the value source.
   ─────────────────────────────────────────────────────────── */
function buildPicker(selectId, groupId, schools) {
  if (document.getElementById(selectId + '_picker')) return; // already built

  const group  = document.getElementById(groupId);
  const select = document.getElementById(selectId);
  const errEl  = document.getElementById(selectId + 'Err');
  if (!group || !select) return;

  // Build markup
  const wrap = document.createElement('div');
  wrap.className = 'school-picker';
  wrap.id = selectId + '_picker';
  wrap.innerHTML =
    '<div class="school-picker-field" id="' + selectId + '_pfield">' +
      '<i class="fas fa-school school-picker-icon"></i>' +
      '<input type="text" id="' + selectId + '_pinput"' +
        ' class="school-picker-input" placeholder="Search for your school…"' +
        ' autocomplete="off" />' +
      '<button type="button" class="school-picker-clear" id="' + selectId + '_pclear"' +
        ' hidden aria-label="Clear"><i class="fas fa-times"></i></button>' +
    '</div>' +
    '<ul class="school-picker-list" id="' + selectId + '_plist" role="listbox" hidden></ul>';

  // Insert before the error span
  if (errEl) group.insertBefore(wrap, errEl);
  else group.appendChild(wrap);

  const pfield  = document.getElementById(selectId + '_pfield');
  const pinput  = document.getElementById(selectId + '_pinput');
  const plist   = document.getElementById(selectId + '_plist');
  const pclear  = document.getElementById(selectId + '_pclear');

  function render(q) {
    q = (q || '').trim().toLowerCase();
    const hits = q ? schools.filter(s => s.name.toLowerCase().includes(q)) : schools;
    if (!hits.length) {
      plist.innerHTML =
        '<li class="sp-empty"><i class="fas fa-search"></i>' +
        '<span>No schools found' + (q ? ' for "' + API.escapeHtml(q) + '"' : '') + '</span></li>';
      return;
    }
    plist.innerHTML = hits.map(s =>
      '<li class="sp-option" role="option" data-id="' + s.id + '" data-name="' + API.escapeHtml(s.name) + '">' +
        '<span class="sp-option-name">' + API.escapeHtml(s.name) + '</span>' +
        '<span class="sp-option-level">' + API.escapeHtml(API.levelLabel ? API.levelLabel(s.level) : (s.level || '')) + '</span>' +
      '</li>'
    ).join('');
    plist.querySelectorAll('.sp-option').forEach(opt => {
      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        select.value  = opt.dataset.id;
        pinput.value  = opt.dataset.name;
        pclear.hidden = false;
        plist.hidden  = true;
        pfield.classList.remove('focused', 'invalid');
        if (errEl) errEl.textContent = '';
        select.dispatchEvent(new Event('change'));
      });
    });
  }

  pinput.addEventListener('focus', () => {
    pfield.classList.add('focused');
    render(pinput.value);
    plist.hidden = false;
  });
  pinput.addEventListener('input', () => {
    select.value  = '';
    pclear.hidden = !pinput.value;
    render(pinput.value);
    plist.hidden  = false;
  });
  pinput.addEventListener('blur', () => {
    pfield.classList.remove('focused');
    setTimeout(() => {
      plist.hidden = true;
      if (!select.value) { pinput.value = ''; pclear.hidden = true; }
      else {
        const m = schools.find(s => String(s.id) === String(select.value));
        if (m) pinput.value = m.name;
      }
    }, 180);
  });
  pclear.addEventListener('click', e => {
    e.stopPropagation();
    select.value  = '';
    pinput.value  = '';
    pclear.hidden = true;
    pfield.classList.remove('invalid');
    if (errEl) errEl.textContent = '';
    pinput.focus();
    select.dispatchEvent(new Event('change'));
  });
}

async function initPickers() {
  const schools = await loadSchools();
  buildPicker('staffSchool', 'staffSchoolGroup', schools);
  buildPicker('regSchool',   'regSchoolGroup',   schools);
}

/* ── Panel navigation ── */
const stepRole     = document.getElementById('stepRole');
const stepStaff    = document.getElementById('stepStaff');
const stepAdmin    = document.getElementById('stepAdmin');
const stepRegister = document.getElementById('stepRegister');
const allSteps     = [stepRole, stepStaff, stepAdmin, stepRegister];

function showStep(step) {
  allSteps.forEach(s => s.setAttribute('hidden', ''));
  step.removeAttribute('hidden');
}

document.getElementById('roleSchool').addEventListener('click', async () => {
  showStep(stepStaff);
  await initPickers();
});
document.getElementById('roleAdmin').addEventListener('click', () => showStep(stepAdmin));
document.getElementById('registerLink').addEventListener('click', async e => {
  e.preventDefault();
  showStep(stepRegister);
  await initPickers();
});
document.getElementById('backFromStaff').addEventListener('click',    () => showStep(stepRole));
document.getElementById('backFromAdmin').addEventListener('click',     () => showStep(stepRole));
document.getElementById('backFromRegister').addEventListener('click',  () => showStep(stepStaff));

/* ── Password toggle ── */
document.querySelectorAll('.field-eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const inp  = document.getElementById(btn.dataset.target);
    const icon = btn.querySelector('i');
    if (inp.type === 'password') {
      inp.type = 'text';
      icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      inp.type = 'password';
      icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  });
});

/* ── Validation helpers ── */
function fieldErr(id, errId, msg) {
  const pfield = document.getElementById(id + '_pfield'); // picker
  const el     = document.getElementById(id);
  const err    = document.getElementById(errId);
  if (pfield) pfield.classList.add('invalid');
  else if (el) el.classList.add('invalid');
  if (err) err.textContent = msg;
}
function fieldOk(id, errId) {
  const pfield = document.getElementById(id + '_pfield');
  const el     = document.getElementById(id);
  const err    = document.getElementById(errId);
  if (pfield) pfield.classList.remove('invalid');
  else if (el) el.classList.remove('invalid');
  if (err) err.textContent = '';
}

function showAlert(formId, msg) {
  let el = document.getElementById(formId + '_alert');
  if (!el) {
    el = document.createElement('div');
    el.id = formId + '_alert';
    el.className = 'auth-alert';
    document.getElementById(formId).prepend(el);
  }
  el.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + API.escapeHtml(msg);
  el.style.display = 'flex';
}
function hideAlert(formId) {
  const el = document.getElementById(formId + '_alert');
  if (el) el.style.display = 'none';
}

/* ── Staff login ── */
document.getElementById('schoolLoginForm').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('schoolLoginForm');

  const schoolId = document.getElementById('staffSchool').value;
  const email    = document.getElementById('schoolEmail').value.trim();
  const password = document.getElementById('schoolPassword').value;
  let ok = true;

  fieldOk('staffSchool',    'staffSchoolErr');
  fieldOk('schoolEmail',    'schoolEmailErr');
  fieldOk('schoolPassword', 'schoolPasswordErr');

  if (!schoolId) { fieldErr('staffSchool',    'staffSchoolErr',    'Please select your school.');  ok = false; }
  if (!email)    { fieldErr('schoolEmail',    'schoolEmailErr',    'Email is required.');           ok = false; }
  if (!password) { fieldErr('schoolPassword', 'schoolPasswordErr', 'Password is required.');        ok = false; }
  if (!ok) return;

  const btn = document.getElementById('schoolLoginBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';
  try {
    await API.auth.loginStaff(schoolId, email, password);
    window.location.href = '/html/school-dashboard.html';
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    showAlert('schoolLoginForm', err.message);
  }
});

document.getElementById('staffSchool').addEventListener('change',   () => fieldOk('staffSchool',    'staffSchoolErr'));
document.getElementById('schoolEmail').addEventListener('input',    () => fieldOk('schoolEmail',    'schoolEmailErr'));
document.getElementById('schoolPassword').addEventListener('input', () => fieldOk('schoolPassword', 'schoolPasswordErr'));

/* ── Admin login ── */
document.getElementById('adminLoginForm').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('adminLoginForm');

  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  let ok = true;

  fieldOk('adminUsername', 'adminUsernameErr');
  fieldOk('adminPassword', 'adminPasswordErr');

  if (!username) { fieldErr('adminUsername', 'adminUsernameErr', 'Username is required.'); ok = false; }
  if (!password) { fieldErr('adminPassword', 'adminPasswordErr', 'Password is required.'); ok = false; }
  if (!ok) return;

  const btn = document.getElementById('adminLoginBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';
  try {
    await API.auth.loginAdmin(username, password);
    window.location.href = '/html/admin-dashboard.html';
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In as Admin';
    showAlert('adminLoginForm', err.message);
  }
});

document.getElementById('adminUsername').addEventListener('input', () => fieldOk('adminUsername', 'adminUsernameErr'));
document.getElementById('adminPassword').addEventListener('input', () => fieldOk('adminPassword', 'adminPasswordErr'));

/* ── Staff registration ── */
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('registerForm');

  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName  = document.getElementById('regLastName').value.trim();
  const position  = document.getElementById('regPosition').value;
  const schoolId  = document.getElementById('regSchool').value;
  const email     = document.getElementById('regEmail').value.trim();
  const pw        = document.getElementById('regPassword').value;
  const confirm   = document.getElementById('regConfirm').value;
  const terms     = document.getElementById('regTerms').checked;
  let ok = true;

  const checks = [
    ['regFirstName', 'regFirstNameErr', !firstName,                                           'First name is required.'],
    ['regLastName',  'regLastNameErr',  !lastName,                                            'Last name is required.'],
    ['regPosition',  'regPositionErr',  !position,                                            'Please select your position.'],
    ['regSchool',    'regSchoolErr',    !schoolId,                                            'Please select your school.'],
    ['regEmail',     'regEmailErr',     !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),  'A valid email is required.'],
    ['regPassword',  'regPasswordErr',  pw.length < 8,                                        'Password must be at least 8 characters.'],
    ['regConfirm',   'regConfirmErr',   pw !== confirm,                                        'Passwords do not match.'],
  ];
  checks.forEach(([id, errId, cond, msg]) => {
    if (cond) { fieldErr(id, errId, msg); ok = false; }
    else fieldOk(id, errId);
  });

  const termsErr = document.getElementById('regTermsErr');
  if (!terms) { termsErr.textContent = 'You must agree to the terms.'; ok = false; }
  else termsErr.textContent = '';

  if (!ok) return;

  const btn = document.querySelector('#registerForm button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account…';

  try {
    await API.auth.register({ firstName, lastName, position, schoolId, email, password: pw });
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    document.getElementById('registerForm').reset();

    // Reset school picker visually
    const pinput = document.getElementById('regSchool_pinput');
    const pclear = document.getElementById('regSchool_pclear');
    if (pinput) pinput.value = '';
    if (pclear) pclear.hidden = true;

    showStep(stepStaff);

    // Pre-fill email; pre-fill school picker if possible
    document.getElementById('schoolEmail').value = email;
    const matched = _schools.find(s => String(s.id) === String(schoolId));
    if (matched) {
      document.getElementById('staffSchool').value = String(matched.id);
      const sp = document.getElementById('staffSchool_pinput');
      const sc = document.getElementById('staffSchool_pclear');
      if (sp) sp.value = matched.name;
      if (sc) sc.hidden = false;
    }

    // Success banner
    const banner = document.createElement('div');
    banner.className = 'auth-success';
    banner.innerHTML =
      '<i class="fas fa-check-circle"></i>' +
      '<span>Account created for <strong>' + API.escapeHtml(firstName + ' ' + lastName) +
      '</strong>. Awaiting Division Office approval.</span>';
    stepStaff.querySelector('form').prepend(banner);
    setTimeout(() => banner.remove(), 8000);
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    showAlert('registerForm', err.message);
  }
});

document.getElementById('regFirstName').addEventListener('input',  () => fieldOk('regFirstName', 'regFirstNameErr'));
document.getElementById('regLastName').addEventListener('input',   () => fieldOk('regLastName',  'regLastNameErr'));
document.getElementById('regPosition').addEventListener('change',  () => fieldOk('regPosition',  'regPositionErr'));
document.getElementById('regEmail').addEventListener('input',      () => fieldOk('regEmail',     'regEmailErr'));
document.getElementById('regPassword').addEventListener('input',   () => fieldOk('regPassword',  'regPasswordErr'));
document.getElementById('regConfirm').addEventListener('input',    () => fieldOk('regConfirm',   'regConfirmErr'));

/* ── Password strength meter ── */
(function initPwStrength() {
  const pwInput   = document.getElementById('regPassword');
  const container = document.getElementById('pwStrength');
  const label     = document.getElementById('pwStrengthLabel');
  const bars      = [1,2,3,4].map(n => document.getElementById('pwBar' + n));
  if (!pwInput || !container) return;

  const levels = [
    { min: 0,  score: 0, cls: '',       text: '' },
    { min: 1,  score: 1, cls: 'weak',   text: 'Weak' },
    { min: 2,  score: 2, cls: 'fair',   text: 'Fair' },
    { min: 3,  score: 3, cls: 'good',   text: 'Good' },
    { min: 4,  score: 4, cls: 'strong', text: 'Strong' },
  ];

  function score(pw) {
    let s = 0;
    if (pw.length >= 8)                    s++;
    if (/[A-Z]/.test(pw))                  s++;
    if (/[0-9]/.test(pw))                  s++;
    if (/[^A-Za-z0-9]/.test(pw))           s++;
    return s;
  }

  pwInput.addEventListener('input', () => {
    const pw = pwInput.value;
    if (!pw) { container.hidden = true; return; }
    container.hidden = false;
    const s = score(pw);
    const lvl = levels[s] || levels[0];
    bars.forEach((b, i) => {
      b.className = 'pw-bar';
      if (i < s) b.classList.add('active-' + lvl.cls);
    });
    label.className = 'pw-strength-label ' + lvl.cls;
    label.textContent = lvl.text;
  });
})();
