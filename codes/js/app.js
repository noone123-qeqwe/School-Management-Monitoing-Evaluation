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
    if (!href || !href.startsWith("#")) return;
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

  toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3600);
}
