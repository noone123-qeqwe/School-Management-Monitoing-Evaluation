const hamburger = document.getElementById("hamburger");
const mainNav = document.getElementById("mainNav");
const header = document.querySelector(".header");
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("section[id]");
const contactForm = document.getElementById("contactForm");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (hamburger && mainNav) {
  hamburger.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", String(isOpen));
  });

  mainNav.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (event) => {
    if (!mainNav.classList.contains("open")) return;
    if (mainNav.contains(event.target) || hamburger.contains(event.target)) return;
    mainNav.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !mainNav.classList.contains("open")) return;
    mainNav.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
  });
}

if ('IntersectionObserver' in window && navLinks.length > 0) {
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, {
    rootMargin: '-20% 0px -70% 0px'
  });

  sections.forEach(section => navObserver.observe(section));
}

if (header) {
  window.addEventListener("scroll", () => {
    header.style.boxShadow = window.scrollY > 6 ? "0 8px 24px rgba(15,23,42,0.08)" : "none";
  }, { passive: true });
}

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("#") || href === "#") return;
    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - ((header?.offsetHeight || 74) - 1);
    window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });
});

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("cName");
    const email = document.getElementById("cEmail");
    const message = document.getElementById("cMessage");

    if (!name?.value.trim() || !email?.value.trim() || !message?.value.trim()) {
      showToast("Please complete all required fields.", "error");
      return;
    }

    const btn = contactForm.querySelector('button[type="submit"]');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
      contactForm.reset();
      showToast("Your message has been sent. We'll get back to you shortly.", "success");
    }, 1200);
  });
}

function showToast(message, type) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type || ""}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");

  const icon = type === "success"
    ? "fa-check-circle"
    : type === "error"
      ? "fa-exclamation-circle"
      : "fa-info-circle";

  toast.innerHTML = `<i class="fas ${icon}"></i> `;
  toast.appendChild(document.createTextNode(message));
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3600);
}

if (!prefersReducedMotion) {
  document.querySelectorAll('.premium-float-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;
      card.style.transform = `translateY(-10px) scale(1.05) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  });

  document.querySelectorAll('.card, .level-card, .contact-info, .contact-form').forEach(el => {
    el.classList.add('animate-on-scroll');
    scrollObserver.observe(el);
  });
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('v2-view-all')) {
    e.preventDefault();
    const section = e.target.closest('section') || document;
    const grid = section.querySelector('.v2-stats-grid');
    if (!grid) return;

    const isGridMode = grid.classList.toggle('grid-mode');
    e.target.textContent = isGridMode ? 'Show Less' : 'View All';
  }
});

/* ── Cinematic Intro Controller ── */
(function runCinematicIntro() {
  const intro = document.getElementById('cinematicIntro');
  const mainContent = document.getElementById('main-site-content');
  const progressBar = document.querySelector('.intro-loader-progress');
  const skipBtn = document.querySelector('.intro-skip-btn');
  const particleContainer = document.querySelector('.intro-particles');

  if (!intro) return;
  document.body.style.overflow = 'hidden';

  // Generate ambient particles
  if (particleContainer) {
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('span');
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 8 + 's';
      p.style.animationDuration = (Math.random() * 10 + 10) + 's';
      particleContainer.appendChild(p);
    }
  }

  // Sequence Timing
  setTimeout(() => intro.classList.add('logo-revealed'), 400);
  setTimeout(() => intro.classList.add('text-revealed'), 1600);

  setTimeout(() => {
    intro.classList.add('loading-started');
    intro.classList.add('lines-revealed');
    intro.classList.add('skip-visible');
    if (progressBar) progressBar.style.width = '100%';
  }, 2800);

  const finishIntro = () => {
    if (intro.dataset.finished === 'true') return;
    intro.dataset.finished = 'true';

    intro.classList.add('exit-active');

    if (mainContent) {
      mainContent.classList.add('revealed');
    }

    setTimeout(() => {
      intro.remove();
      document.body.style.overflow = '';
    }, 1500);
  };

  if (skipBtn) skipBtn.addEventListener('click', finishIntro);
  setTimeout(finishIntro, 6000);
})();