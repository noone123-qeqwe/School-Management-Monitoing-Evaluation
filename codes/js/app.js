/* ============================================================
   SMME PORTAL — Landing Page (index.html) only
   ============================================================ */

/* ── Hamburger menu ── */
const hamburger = document.getElementById('hamburger');
const mainNav   = document.getElementById('mainNav');

if (hamburger && mainNav) {
  hamburger.addEventListener('click', () => {
    mainNav.classList.toggle('open');
  });

  // Close nav when a link is clicked (mobile)
  mainNav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => mainNav.classList.remove('open'));
  });
}

/* ── Scroll spy — highlight active nav link ── */
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY + 80;
  sections.forEach(section => {
    const top    = section.offsetTop;
    const height = section.offsetHeight;
    const link   = document.querySelector(`.nav-link[href="#${section.id}"]`);
    if (link && scrollY >= top && scrollY < top + height) {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
  });
}, { passive: true });

/* ── Contact form ── */
const contactForm = document.getElementById('contactForm');
if (contactForm) {
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
}

/* ── Toast ── */
function showToast(message, type) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || '');
  const icon = type === 'success' ? 'fa-check-circle'
             : type === 'error'   ? 'fa-exclamation-circle'
             : 'fa-info-circle';
  toast.innerHTML = '<i class="fas ' + icon + '"></i> ' + message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
