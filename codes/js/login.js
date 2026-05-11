/**
 * SMME Portal — login & staff registration UI
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function showStep(step) {
    ['stepRole', 'stepStaff', 'stepAdmin', 'stepRegister'].forEach((id) => {
      const el = $(id);
      if (el) el.hidden = id !== step;
    });
  }

  function clearErrors() {
    document.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
    document.querySelectorAll('.field-input.invalid, .field-select.invalid').forEach((el) => {
      el.classList.remove('invalid');
    });
  }

  function bindPasswordEyes() {
    document.querySelectorAll('.field-eye[data-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const inp = $(btn.getAttribute('data-target'));
        if (!inp) return;
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-eye', !show);
          icon.classList.toggle('fa-eye-slash', show);
        }
      });
    });
  }

  function fillSchoolSelects(schools) {
    const opts = schools
      .slice()
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .map((s) => `<option value="${String(s.id)}">${escapeAttr(s.name)} (${escapeAttr(s.school_code || '')})</option>`)
      .join('');
    const placeholder = '<option value="">-- Select your school --</option>';
    ['staffSchool', 'regSchool'].forEach((id) => {
      const sel = $(id);
      if (!sel) return;
      sel.innerHTML = placeholder + opts;
    });
  }

  function escapeAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function updatePwStrength() {
    const pw = $('regPassword');
    const box = $('pwStrength');
    if (!pw || !box) return;
    const v = pw.value;
    const barClasses = ['active-weak', 'active-fair', 'active-good', 'active-strong'];
    for (let i = 1; i <= 4; i++) {
      const bar = $('pwBar' + i);
      if (bar) barClasses.forEach((c) => bar.classList.remove(c));
    }
    if (!v) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    let score = 0;
    if (v.length >= 8) score++;
    if (v.length >= 12) score++;
    if (/[0-9]/.test(v) && /[a-zA-Z]/.test(v)) score++;
    if (/[^a-zA-Z0-9]/.test(v)) score++;
    const tier = Math.min(Math.max(score, 1), 4);
    const tierCls = ['active-weak', 'active-fair', 'active-good', 'active-strong'][tier - 1];
    for (let i = 1; i <= 4; i++) {
      const bar = $('pwBar' + i);
      if (bar && i <= tier) bar.classList.add(tierCls);
    }
    const label = $('pwStrengthLabel');
    const tiers = [
      { text: 'Weak', cls: 'weak' },
      { text: 'Fair', cls: 'fair' },
      { text: 'Good', cls: 'good' },
      { text: 'Strong', cls: 'strong' },
    ];
    if (label) {
      label.classList.remove('weak', 'fair', 'good', 'strong');
      const t = tiers[tier - 1];
      label.textContent = t.text;
      label.classList.add(t.cls);
    }
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logout') === '1') {
      try {
        sessionStorage.removeItem('smme_token');
        sessionStorage.removeItem('smme_user');
      } catch { /* ignore */ }
      window.history.replaceState({}, '', '/html/login.html');
    }

    try {
      const schools = await API.auth.getSchools();
      if (Array.isArray(schools) && schools.length) fillSchoolSelects(schools);
    } catch (e) {
      API.showToast('Could not load school list. Check your connection.', 'error');
    }

    if (API.auth.isLoggedIn()) {
      const u = API.auth.getUser();
      if (u && u.role === 'staff') window.location.href = '/html/school-dashboard.html';
      else if (u && u.role === 'admin') window.location.href = '/html/admin-dashboard.html';
    }

    $('roleSchool')?.addEventListener('click', () => showStep('stepStaff'));
    $('roleAdmin')?.addEventListener('click', () => showStep('stepAdmin'));
    $('backFromStaff')?.addEventListener('click', () => showStep('stepRole'));
    $('backFromAdmin')?.addEventListener('click', () => showStep('stepRole'));
    $('backFromRegister')?.addEventListener('click', () => showStep('stepStaff'));

    $('registerLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      clearErrors();
      showStep('stepRegister');
    });

    bindPasswordEyes();
    $('regPassword')?.addEventListener('input', updatePwStrength);

    $('schoolLoginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const schoolId = $('staffSchool')?.value?.trim();
      const email = $('schoolEmail')?.value?.trim().toLowerCase() || '';
      const password = $('schoolPassword')?.value || '';
      let ok = true;
      if (!schoolId) {
        ok = false;
        $('staffSchoolErr').textContent = 'Please select your school.';
        $('staffSchool')?.classList.add('invalid');
      }
      if (!email) {
        ok = false;
        $('schoolEmailErr').textContent = 'Email is required.';
        $('schoolEmail')?.classList.add('invalid');
      }
      if (!password) {
        ok = false;
        $('schoolPasswordErr').textContent = 'Password is required.';
        $('schoolPassword')?.classList.add('invalid');
      }
      if (!ok) return;

      const btn = $('schoolLoginBtn');
      const prev = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
      try {
        await API.auth.loginStaff(schoolId, email, password);
        window.location.href = '/html/school-dashboard.html';
      } catch (err) {
        API.showToast(err.message || 'Sign in failed.', 'error');
        btn.disabled = false;
        btn.innerHTML = prev;
      }
    });

    $('adminLoginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const username = $('adminUsername')?.value?.trim() || '';
      const password = $('adminPassword')?.value || '';
      let ok = true;
      if (!username) {
        ok = false;
        $('adminUsernameErr').textContent = 'Username is required.';
        $('adminUsername')?.classList.add('invalid');
      }
      if (!password) {
        ok = false;
        $('adminPasswordErr').textContent = 'Password is required.';
        $('adminPassword')?.classList.add('invalid');
      }
      if (!ok) return;

      const btn = $('adminLoginBtn');
      const prev = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
      try {
        await API.auth.loginAdmin(username, password);
        window.location.href = '/html/admin-dashboard.html';
      } catch (err) {
        API.showToast(err.message || 'Sign in failed.', 'error');
        btn.disabled = false;
        btn.innerHTML = prev;
      }
    });

    $('registerForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const firstName = $('regFirstName')?.value?.trim() || '';
      const lastName = $('regLastName')?.value?.trim() || '';
      const position = $('regPosition')?.value?.trim() || '';
      const schoolId = $('regSchool')?.value?.trim() || '';
      const email = $('regEmail')?.value?.trim().toLowerCase() || '';
      const password = $('regPassword')?.value || '';
      const confirm = $('regConfirm')?.value || '';
      const terms = $('regTerms')?.checked;

      let ok = true;
      const setErr = (id, msg, inputId) => {
        ok = false;
        const err = $(id);
        if (err) err.textContent = msg;
        if (inputId && $(inputId)) $(inputId).classList.add('invalid');
      };
      if (!firstName) setErr('regFirstNameErr', 'First name is required.', 'regFirstName');
      if (!lastName) setErr('regLastNameErr', 'Last name is required.', 'regLastName');
      if (!position) setErr('regPositionErr', 'Please select your position.', 'regPosition');
      if (!schoolId) setErr('regSchoolErr', 'Please select your school.', 'regSchool');
      if (!email) setErr('regEmailErr', 'Email is required.', 'regEmail');
      if (password.length < 8) setErr('regPasswordErr', 'Password must be at least 8 characters.', 'regPassword');
      if (password !== confirm) setErr('regConfirmErr', 'Passwords do not match.', 'regConfirm');
      if (!terms) setErr('regTermsErr', 'You must accept the terms to register.', 'regTerms');
      if (!ok) return;

      const formEl = $('registerForm');
      const btn = formEl && formEl.querySelector('button[type="submit"]');
      const prev = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
      }
      try {
        await API.auth.register({ firstName, lastName, position, schoolId, email, password });
        API.showToast('Account created. Awaiting Division Office approval.', 'success');
        showStep('stepStaff');
        formEl.reset();
        const pwBox = $('pwStrength');
        if (pwBox) pwBox.hidden = true;
      } catch (err) {
        API.showToast(err.message || 'Registration failed.', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = prev;
        }
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
