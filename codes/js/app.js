/* ===== NAVIGATION ===== */
const hamburger = document.getElementById('hamburger');
const mainNav   = document.getElementById('mainNav');
const navLinks  = document.querySelectorAll('.nav-link');

hamburger.addEventListener('click', () => {
  mainNav.classList.toggle('open');
});

// Close nav on link click (mobile)
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
  });
});

// Active nav link on scroll
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY + 80;
  sections.forEach(section => {
    const top    = section.offsetTop;
    const height = section.offsetHeight;
    const id     = section.getAttribute('id');
    const link   = document.querySelector(`.nav-link[href="#${id}"]`);
    if (link) {
      if (scrollY >= top && scrollY < top + height) {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    }
  });
}, { passive: true });


/* ===== FILE UPLOAD ===== */
const uploadArea   = document.getElementById('uploadArea');
const fileInput    = document.getElementById('fileInput');
const browseBtn    = document.getElementById('browseBtn');
const fileList     = document.getElementById('fileList');
let selectedFiles  = [];

browseBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  addFiles(Array.from(fileInput.files));
  fileInput.value = '';
});

uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  addFiles(Array.from(e.dataTransfer.files));
});

function addFiles(files) {
  const allowed = ['application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

  files.forEach(file => {
    if (!allowed.includes(file.type)) {
      showToast(`"${file.name}" is not a supported file type.`, 'error');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast(`"${file.name}" exceeds the 20MB limit.`, 'error');
      return;
    }
    if (selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
      showToast(`"${file.name}" is already added.`, 'error');
      return;
    }
    selectedFiles.push(file);
  });
  renderFileList();
}

function renderFileList() {
  fileList.innerHTML = '';
  selectedFiles.forEach((file, index) => {
    const li = document.createElement('li');
    li.className = 'file-item';

    const iconClass = getFileIconClass(file.type);
    const iconName  = getFileIconName(file.type);

    li.innerHTML = `
      <i class="fas ${iconName} file-icon ${iconClass}"></i>
      <span class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
      <span class="file-size">${formatSize(file.size)}</span>
      <button class="file-remove" data-index="${index}" aria-label="Remove file" title="Remove">
        <i class="fas fa-times"></i>
      </button>
    `;
    fileList.appendChild(li);
  });

  // Remove buttons
  fileList.querySelectorAll('.file-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      selectedFiles.splice(idx, 1);
      renderFileList();
    });
  });
}

function getFileIconClass(type) {
  if (type === 'application/pdf') return 'pdf';
  if (type.includes('word')) return 'word';
  if (type.includes('excel') || type.includes('spreadsheet')) return 'excel';
  return '';
}

function getFileIconName(type) {
  if (type === 'application/pdf') return 'fa-file-pdf';
  if (type.includes('word')) return 'fa-file-word';
  if (type.includes('excel') || type.includes('spreadsheet')) return 'fa-file-excel';
  return 'fa-file';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


/* ===== FORM VALIDATION & SUBMISSION ===== */
const submissionForm = document.getElementById('submissionForm');
const submitBtn      = document.getElementById('submitBtn');
const resetBtn       = document.getElementById('resetBtn');

const fields = [
  { id: 'schoolName',  errId: 'schoolNameErr',  msg: 'School name is required.' },
  { id: 'schoolId',    errId: 'schoolIdErr',    msg: 'School ID is required.' },
  { id: 'schoolLevel', errId: 'schoolLevelErr', msg: 'Please select a school level.' },
  { id: 'division',    errId: 'divisionErr',    msg: 'Please select a division office.' },
  { id: 'contactName', errId: 'contactNameErr', msg: 'Contact name is required.' },
  { id: 'position',    errId: 'positionErr',    msg: 'Position is required.' },
  { id: 'email',       errId: 'emailErr',       msg: 'A valid email address is required.', type: 'email' },
  { id: 'phone',       errId: 'phoneErr',       msg: 'Contact number is required.' },
  { id: 'docType',     errId: 'docTypeErr',     msg: 'Please select a document type.' },
  { id: 'schoolYear',  errId: 'schoolYearErr',  msg: 'Please select a school year.' },
  { id: 'subject',     errId: 'subjectErr',     msg: 'Subject / purpose is required.' },
];

function validateField(field) {
  const el  = document.getElementById(field.id);
  const err = document.getElementById(field.errId);
  let valid = true;

  if (!el.value.trim()) {
    err.textContent = field.msg;
    el.classList.add('invalid');
    valid = false;
  } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) {
    err.textContent = field.msg;
    el.classList.add('invalid');
    valid = false;
  } else {
    err.textContent = '';
    el.classList.remove('invalid');
  }
  return valid;
}

// Live validation
fields.forEach(field => {
  const el = document.getElementById(field.id);
  el.addEventListener('blur', () => validateField(field));
  el.addEventListener('input', () => {
    if (el.classList.contains('invalid')) validateField(field);
  });
});

submissionForm.addEventListener('submit', e => {
  e.preventDefault();

  let allValid = true;
  fields.forEach(field => {
    if (!validateField(field)) allValid = false;
  });

  // File validation
  const fileErr = document.getElementById('fileErr');
  if (selectedFiles.length === 0) {
    fileErr.textContent = 'Please attach at least one file.';
    allValid = false;
  } else {
    fileErr.textContent = '';
  }

  if (!allValid) {
    const firstInvalid = submissionForm.querySelector('.invalid');
    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Simulate submission
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit to Division Office';

    const refNum = generateRefNumber();
    document.getElementById('refNumber').textContent = refNum;
    document.getElementById('modalOverlay').removeAttribute('hidden');

    // Reset
    submissionForm.reset();
    selectedFiles = [];
    renderFileList();
    fields.forEach(f => {
      document.getElementById(f.id).classList.remove('invalid');
      document.getElementById(f.errId).textContent = '';
    });
  }, 2000);
});

resetBtn.addEventListener('click', () => {
  selectedFiles = [];
  renderFileList();
  fields.forEach(f => {
    document.getElementById(f.id).classList.remove('invalid');
    document.getElementById(f.errId).textContent = '';
  });
});

document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('modalOverlay').setAttribute('hidden', '');
});

document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) {
    document.getElementById('modalOverlay').setAttribute('hidden', '');
  }
});

function generateRefNumber() {
  const year = new Date().getFullYear();
  const num  = String(Math.floor(Math.random() * 90000) + 10000);
  return `SMME-${year}-${num}`;
}


/* ===== TRACK SUBMISSION ===== */
const trackBtn    = document.getElementById('trackBtn');
const trackInput  = document.getElementById('trackInput');
const trackResult = document.getElementById('trackResult');

// Demo data
const demoSubmissions = {
  'SMME-2026-12345': {
    school: 'St. Mary\'s Academy',
    level: 'Elementary',
    docType: 'Enrollment Report',
    submittedBy: 'Maria Santos',
    date: 'May 5, 2026',
    status: 'review',
    statusLabel: 'Under Review',
    steps: [
      { label: 'Submitted', date: 'May 5, 2026 – 9:14 AM', done: true },
      { label: 'Received by Division Office', date: 'May 5, 2026 – 10:02 AM', done: true },
      { label: 'Under Review', date: 'May 6, 2026 – 8:30 AM', active: true },
      { label: 'Approved / Processed', date: 'Pending', pending: true },
    ]
  },
  'SMME-2026-67890': {
    school: 'Holy Cross Kindergarten',
    level: 'Kindergarten',
    docType: 'Compliance Requirements',
    submittedBy: 'Jose Reyes',
    date: 'April 28, 2026',
    status: 'approved',
    statusLabel: 'Approved',
    steps: [
      { label: 'Submitted', date: 'Apr 28, 2026 – 2:00 PM', done: true },
      { label: 'Received by Division Office', date: 'Apr 28, 2026 – 3:15 PM', done: true },
      { label: 'Under Review', date: 'Apr 29, 2026 – 9:00 AM', done: true },
      { label: 'Approved / Processed', date: 'Apr 30, 2026 – 11:45 AM', done: true },
    ]
  },
};

trackBtn.addEventListener('click', () => {
  const ref = trackInput.value.trim().toUpperCase();
  if (!ref) {
    showToast('Please enter a reference number.', 'error');
    return;
  }

  trackBtn.disabled = true;
  trackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';

  setTimeout(() => {
    trackBtn.disabled = false;
    trackBtn.innerHTML = '<i class="fas fa-search"></i> Track';

    const data = demoSubmissions[ref];
    if (!data) {
      showToast('Reference number not found. Please check and try again.', 'error');
      trackResult.setAttribute('hidden', '');
      return;
    }

    document.getElementById('trackRef').textContent = ref;
    document.getElementById('trackStatus').textContent = data.statusLabel;
    document.getElementById('trackStatus').className = `track-status status-${data.status}`;

    document.getElementById('trackDetails').innerHTML = `
      <strong>${escapeHtml(data.school)}</strong><br/>
      Level: ${escapeHtml(data.level)} &nbsp;|&nbsp; Document: ${escapeHtml(data.docType)}<br/>
      Submitted by: ${escapeHtml(data.submittedBy)} &nbsp;|&nbsp; Date: ${escapeHtml(data.date)}
    `;

    const timeline = document.getElementById('trackTimeline');
    timeline.innerHTML = data.steps.map(step => {
      const dotClass = step.done ? 'dot-done' : step.active ? 'dot-active' : 'dot-pending';
      const icon     = step.done ? 'fa-check' : step.active ? 'fa-circle' : 'fa-circle';
      return `
        <div class="timeline-step">
          <div class="timeline-dot ${dotClass}"><i class="fas ${icon}"></i></div>
          <div class="timeline-content">
            <strong>${escapeHtml(step.label)}</strong>
            <span>${escapeHtml(step.date)}</span>
          </div>
        </div>
      `;
    }).join('');

    trackResult.removeAttribute('hidden');
    trackResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 1200);
});

trackInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') trackBtn.click();
});


/* ===== CONTACT FORM ===== */
const contactForm = document.getElementById('contactForm');
contactForm.addEventListener('submit', e => {
  e.preventDefault();
  const btn = contactForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
    contactForm.reset();
    showToast('Your message has been sent. We\'ll get back to you shortly.', 'success');
  }, 1500);
});


/* ===== TOAST ===== */
function showToast(message, type = '') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
  toast.innerHTML = `<i class="fas ${icon}"></i> ${escapeHtml(message)}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}


/* ===== DEMO HINT ===== */
// Show demo reference numbers hint in track section
window.addEventListener('load', () => {
  const trackSection = document.querySelector('.track-input-group');
  if (trackSection) {
    const hint = document.createElement('p');
    hint.style.cssText = 'font-size:0.78rem;color:#64748b;margin-top:-16px;margin-bottom:8px;';
    hint.innerHTML = '💡 Demo: Try <strong>SMME-2026-12345</strong> or <strong>SMME-2026-67890</strong>';
    trackSection.insertAdjacentElement('afterend', hint);
  }
});
