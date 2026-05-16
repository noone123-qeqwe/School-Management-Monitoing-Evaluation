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

/* ── Performance Optimized Scroll Spy ── */
if ('IntersectionObserver' in window) {
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
    rootMargin: '-20% 0px -70% 0px' // Adjusts based on the viewport focus
  });

  sections.forEach(section => navObserver.observe(section));
}

window.addEventListener("scroll", () => {
  // Simplified shadow logic
  if (header) {
    header.style.boxShadow = window.scrollY > 6 ? "0 8px 24px rgba(15,23,42,0.08)" : "none";
  }
}, { passive: true });

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

/* ── Interactive Geometric Parallax ── */
if (!prefersReducedMotion && document.querySelector('.elegant-shape')) {
  let ticking = false;

  document.addEventListener('mousemove', (e) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const shapes = document.querySelectorAll('.elegant-shape');
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        shapes.forEach((shape, index) => {
          const factor = (index + 1) * 10;
          const moveX = (x - 0.5) * factor;
          const moveY = (y - 0.5) * factor;
          shape.style.transform = `translate(${moveX}px, ${moveY}px) rotate(var(--rotate))`;
        });
        ticking = false;
      });
      ticking = true;
    }
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

/* ── Premium Floating Cards 3D Hover Effect ── */
if (!prefersReducedMotion) {
  document.querySelectorAll('.premium-float-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -10; // Max 10 degrees tilt
      const rotateY = ((x - centerX) / centerX) * 10;
      card.style.transform = `translateY(-10px) scale(1.05) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = ''; // Reset to CSS keyframe transforms
    });
  });
}

/* ── Scroll Animation Observer (Fade In Elements) ── */
if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // Only animate once
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
/* ── Intro Screen Removal ── */
window.addEventListener('load', () => {
  const intro = document.getElementById('introScreen');
  const mainContent = document.getElementById('main-site-content');

  if (intro) {
    setTimeout(() => {
      // Start fading out intro
      intro.style.transition = 'opacity 1.4s cubic-bezier(0.23, 0.86, 0.39, 0.96), transform 1.4s cubic-bezier(0.23, 0.86, 0.39, 0.96), filter 1.2s ease';
      intro.style.opacity = '0';
      intro.style.transform = 'scale(1.05) translateY(-20px)';
      intro.style.filter = 'blur(20px)';

      // Simultaneously start fading in site content
      if (mainContent) {
        mainContent.style.visibility = 'visible';
        mainContent.style.transition = 'opacity 1.5s ease-in-out';
        mainContent.style.opacity = '1';
      }

      setTimeout(() => {
        intro.style.display = 'none';

        // Reset geometric background z-index to sit behind site content
        const geoContainer = document.querySelector('.geometric-container');
        const geoOverlay = document.querySelector('.geometric-bg-overlay');
        if (geoContainer) geoContainer.style.zIndex = '-1';
        if (geoOverlay) geoOverlay.style.zIndex = '-2';
      }, 1400);
    }, 2000); // Give the user 2 seconds to absorb the "Premium" intro
  }
});

/* ── Dashboard V2: Toggle Grid View ── */
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('v2-view-all')) {
    e.preventDefault();
    // Find the closest grid container relative to the clicked link
    const section = e.target.closest('section') || document;
    const grid = section.querySelector('.v2-stats-grid');
    if (!grid) return;

    const isGridMode = grid.classList.toggle('grid-mode');
    e.target.textContent = isGridMode ? 'Show Less' : 'View All';
  }
});