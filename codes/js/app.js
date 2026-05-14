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

function setActiveNavByScroll() {
  const offset = (header?.offsetHeight || 74) + 20;
  const y = window.scrollY + offset;

  let activeId = "";
  sections.forEach((section) => {
    if (y >= section.offsetTop && y < section.offsetTop + section.offsetHeight) {
      activeId = section.id;
    }
  });

  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${activeId}`;
    link.classList.toggle("active", isActive);
  });
}

window.addEventListener("scroll", () => {
  setActiveNavByScroll();
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
      intro.style.opacity = '0';
      intro.style.transition = 'opacity 0.8s ease, visibility 0.8s ease';
      
      // Simultaneously start fading in site content
      if (mainContent) {
        mainContent.style.visibility = 'visible';
        mainContent.style.opacity = '1';
      }

      setTimeout(() => {
        intro.style.visibility = 'hidden';
        intro.style.display = 'none';
        
        // Reset geometric background z-index to sit behind site content
        const geoContainer = document.querySelector('.geometric-container');
        const geoOverlay = document.querySelector('.geometric-bg-overlay');
        if (geoContainer) geoContainer.style.zIndex = '-1';
        if (geoOverlay) geoOverlay.style.zIndex = '-2';
        
        // Final cleanup for main content overflow
        document.body.style.overflow = 'auto';
      }, 800);
    }, 3500); // 3.5 seconds delay to show geometric animation
  }
});
