/**
 * SMME Portal — Modern UI Components Library
 * Provides: Toast notifications, Modals, Skeleton loading, Form validation, Empty states
 */

const ModernUI = (() => {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════════
     TOAST NOTIFICATIONS
     ═══════════════════════════════════════════════════════════════════════════ */

  const ToastContainer = {
    element: null,
    toasts: [],

    init() {
      if (!this.element) {
        this.element = document.createElement('div');
        this.element.className = 'toast-container';
        document.body.appendChild(this.element);
      }
      return this;
    },

    show(message, options = {}) {
      this.init();
      const {
        type = 'info',
        title = null,
        duration = 5000,
        dismissible = true,
        onClose = null
      } = options;

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;

      const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
      };

      const defaultTitles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Information'
      };

      toast.innerHTML = `
        <div class="toast-icon">
          <i class="fas ${iconMap[type]}"></i>
        </div>
        <div class="toast-content">
          ${title !== null ? `<div class="toast-title">${title || defaultTitles[type]}</div>` : ''}
          <div class="toast-message">${message}</div>
        </div>
        ${dismissible ? `
          <button class="toast-close" aria-label="Close">
            <i class="fas fa-times"></i>
          </button>
        ` : ''}
        <div class="toast-progress">
          <div class="toast-progress-bar"></div>
        </div>
      `;

      if (dismissible) {
        toast.querySelector('.toast-close').addEventListener('click', () => {
          this.hide(toast, onClose);
        });
      }

      // Auto-dismiss
      let timeoutId;
      const startTimeout = () => {
        timeoutId = setTimeout(() => {
          this.hide(toast, onClose);
        }, duration);
      };

      // Pause on hover
      toast.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId);
        toast.querySelector('.toast-progress-bar').style.animationPlayState = 'paused';
      });

      toast.addEventListener('mouseleave', () => {
        startTimeout();
        toast.querySelector('.toast-progress-bar').style.animationPlayState = 'running';
      });

      this.element.appendChild(toast);
      this.toasts.push(toast);

      startTimeout();
      return toast;
    },

    hide(toast, callback) {
      toast.classList.add('hiding');
      setTimeout(() => {
        toast.remove();
        this.toasts = this.toasts.filter(t => t !== toast);
        if (callback) callback();
      }, 300);
    },

    success(message, options = {}) {
      return this.show(message, { ...options, type: 'success' });
    },

    error(message, options = {}) {
      return this.show(message, { ...options, type: 'error' });
    },

    warning(message, options = {}) {
      return this.show(message, { ...options, type: 'warning' });
    },

    info(message, options = {}) {
      return this.show(message, { ...options, type: 'info' });
    },

    clear() {
      this.toasts.forEach(toast => this.hide(toast));
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     MODAL SYSTEM
     ═══════════════════════════════════════════════════════════════════════════ */

  const Modal = {
    activeModal: null,
    backdrop: null,

    create(options = {}) {
      const {
        title,
        content,
        icon = null,
        size = 'md',
        type = 'default',
        footer = null,
        closable = true,
        onClose = null,
        onConfirm = null,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        showCancel = true,
        dangerous = false
      } = options;

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      // Build modal HTML
      let modalHTML = `
        <div class="modal modal-${size} modal-${type}">
          <div class="modal-header">
            <div class="modal-title">
              ${icon ? `<div class="modal-title-icon"><i class="fas ${icon}"></i></div>` : ''}
              <span>${title}</span>
            </div>
            ${closable ? `
              <button class="modal-close" aria-label="Close">
                <i class="fas fa-times"></i>
              </button>
            ` : ''}
          </div>
          <div class="modal-body">
            ${content}
          </div>
      `;

      // Add footer
      if (footer !== null || onConfirm) {
        modalHTML += `
          <div class="modal-footer">
            ${footer || `
              ${showCancel ? `<button class="btn btn-ghost modal-cancel">${cancelText}</button>` : ''}
              <button class="btn ${dangerous ? 'btn-danger' : 'btn-primary'} modal-confirm">
                ${confirmText}
              </button>
            `}
          </div>
        `;
      }

      modalHTML += '</div>';
      overlay.innerHTML = modalHTML;

      // Event handlers
      const closeModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          this.activeModal = null;
          if (onClose) onClose();
        }, 300);
      };

      if (closable) {
        overlay.querySelector('.modal-close').addEventListener('click', closeModal);
      }

      if (showCancel) {
        const cancelBtn = overlay.querySelector('.modal-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
      }

      if (onConfirm) {
        const confirmBtn = overlay.querySelector('.modal-confirm');
        if (confirmBtn) {
          confirmBtn.addEventListener('click', () => {
            onConfirm();
            closeModal();
          });
        }
      }

      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay && closable) {
          closeModal();
        }
      });

      // Close on Escape
      const handleEscape = (e) => {
        if (e.key === 'Escape' && closable) {
          closeModal();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);

      document.body.appendChild(overlay);
      this.activeModal = overlay;

      // Trigger animation
      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });

      return {
        element: overlay,
        close: closeModal,
        onConfirm: (callback) => {
          const btn = overlay.querySelector('.modal-confirm');
          if (btn) {
            btn.addEventListener('click', () => {
              callback();
              closeModal();
            });
          }
        }
      };
    },

    confirm(message, options = {}) {
      return this.create({
        title: options.title || 'Confirm Action',
        content: `<p style="color: var(--text-secondary); line-height: 1.6;">${message}</p>`,
        icon: options.icon || 'fa-question-circle',
        type: options.dangerous ? 'danger' : 'default',
        ...options
      });
    },

    alert(message, options = {}) {
      return this.create({
        title: options.title || 'Notice',
        content: `<p style="color: var(--text-secondary); line-height: 1.6;">${message}</p>`,
        icon: options.icon || 'fa-info-circle',
        showCancel: false,
        confirmText: options.confirmText || 'OK',
        ...options
      });
    },

    prompt(message, options = {}) {
      const inputId = 'modal-prompt-input-' + Date.now();
      const modal = this.create({
        title: options.title || 'Enter Value',
        content: `
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">${message}</p>
          <input type="${options.inputType || 'text'}" 
                 id="${inputId}" 
                 class="form-input" 
                 placeholder="${options.placeholder || ''}"
                 value="${options.defaultValue || ''}">
        `,
        icon: 'fa-keyboard',
        ...options
      });

      const originalOnConfirm = modal.onConfirm;
      modal.onConfirm = (callback) => {
        originalOnConfirm(() => {
          const value = document.getElementById(inputId).value;
          callback(value);
        });
      };

      // Auto-focus input
      setTimeout(() => {
        const input = document.getElementById(inputId);
        if (input) input.focus();
      }, 100);

      return modal;
    },

    closeAll() {
      document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
      });
      this.activeModal = null;
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     SKELETON LOADING
     ═══════════════════════════════════════════════════════════════════════════ */

  const Skeleton = {
    templates: {
      text: () => '<div class="skeleton skeleton-text"></div>',
      avatar: (size = '') => `<div class="skeleton skeleton-avatar${size ? ' skeleton-avatar-' + size : ''}"></div>`,
      card: () => '<div class="skeleton skeleton-card"></div>',
      button: () => '<div class="skeleton skeleton-button"></div>',
      input: () => '<div class="skeleton skeleton-input"></div>',

      tableRow: (columns = 5) => `
        <div class="skeleton-table-row">
          ${Array(columns).fill('<div class="skeleton"></div>').join('')}
        </div>
      `,

      statCard: () => `
        <div class="stat-card">
          <div class="skeleton skeleton-avatar" style="width: 48px; height: 48px; border-radius: 12px;"></div>
          <div style="flex: 1;">
            <div class="skeleton skeleton-text" style="width: 60px; height: 24px; margin-bottom: 8px;"></div>
            <div class="skeleton skeleton-text" style="width: 100px; height: 14px;"></div>
          </div>
        </div>
      `,

      formGroup: () => `
        <div style="margin-bottom: 16px;">
          <div class="skeleton skeleton-text" style="width: 100px; height: 14px; margin-bottom: 8px;"></div>
          <div class="skeleton skeleton-input"></div>
        </div>
      `,

      listItem: () => `
        <div class="skeleton-row" style="padding: 12px 0;">
          <div class="skeleton skeleton-avatar-sm" style="width: 40px; height: 40px;"></div>
          <div style="flex: 1;">
            <div class="skeleton skeleton-text" style="width: 70%; margin-bottom: 6px;"></div>
            <div class="skeleton skeleton-text-sm"></div>
          </div>
        </div>
      `
    },

    render(container, template, count = 1) {
      const element = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (!element) {
        console.warn('Skeleton target not found:', container);
        return;
      }

      let html = '';
      const templateFn = typeof template === 'function'
        ? template
        : (this.templates[template] || this.templates.text);

      for (let i = 0; i < count; i++) {
        html += templateFn();
      }

      element.innerHTML = html;
      element.setAttribute('data-skeleton', 'true');

      return element;
    },

    clear(container) {
      const element = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (element) {
        element.innerHTML = '';
        element.removeAttribute('data-skeleton');
      }

      return element;
    },

    wrap(element, duration = 2000) {
      const target = typeof element === 'string'
        ? document.querySelector(element)
        : element;

      if (!target) return;

      const originalContent = target.innerHTML;
      const height = target.offsetHeight;

      target.style.height = height + 'px';
      target.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; padding: 20px;">
          <div class="skeleton skeleton-text" style="height: 20px; width: 60%;"></div>
          <div class="skeleton skeleton-text" style="height: 14px;"></div>
          <div class="skeleton skeleton-text" style="height: 14px; width: 80%;"></div>
        </div>
      `;

      setTimeout(() => {
        target.style.height = '';
        target.innerHTML = originalContent;
      }, duration);
    },

    pulse(element) {
      const target = typeof element === 'string'
        ? document.querySelector(element)
        : element;

      if (target) {
        target.classList.add('skeleton-pulse');
        setTimeout(() => target.classList.remove('skeleton-pulse'), 1000);
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     FORM VALIDATION
     ═══════════════════════════════════════════════════════════════════════════ */

  const FormValidator = {
    rules: {
      required: (value) => value && value.trim().length > 0,
      email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      minLength: (value, length) => value.length >= length,
      maxLength: (value, length) => value.length <= length,
      numeric: (value) => /^\d+$/.test(value),
      phone: (value) => /^[\d\s\-\+\(\)]+$/.test(value),
      url: (value) => /^https?:\/\/.+/.test(value),
      match: (value, otherField) => value === otherField
    },

    validateField(input, rules = []) {
      const value = input.value;
      const errors = [];

      for (const rule of rules) {
        const { type, message, param } = rule;
        const validator = this.rules[type];

        if (validator && !validator(value, param)) {
          errors.push(message || `Invalid ${type}`);
        }
      }

      const formGroup = input.closest('.form-group') || input.parentElement;
      const feedback = formGroup.querySelector('.form-feedback') || this._createFeedback(formGroup);

      if (errors.length > 0) {
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
        feedback.textContent = errors[0];
        feedback.className = 'form-feedback form-feedback-error is-visible';
        return false;
      } else {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        feedback.className = 'form-feedback form-feedback-success is-visible';
        feedback.innerHTML = '<i class="fas fa-check"></i> Valid';
        return true;
      }
    },

    _createFeedback(formGroup) {
      const feedback = document.createElement('div');
      feedback.className = 'form-feedback';
      formGroup.appendChild(feedback);
      return feedback;
    },

    validateForm(form, schema = {}) {
      const inputs = form.querySelectorAll('input, select, textarea');
      let isValid = true;

      inputs.forEach(input => {
        const rules = schema[input.name] || schema[input.id];
        if (rules) {
          const fieldValid = this.validateField(input, rules);
          if (!fieldValid) isValid = false;
        }
      });

      return isValid;
    },

    attachRealtimeValidation(form, schema = {}) {
      const inputs = form.querySelectorAll('input, select, textarea');

      inputs.forEach(input => {
        const rules = schema[input.name] || schema[input.id];
        if (rules) {
          // Validate on blur
          input.addEventListener('blur', () => {
            this.validateField(input, rules);
          });

          // Clear error on input
          input.addEventListener('input', () => {
            if (input.classList.contains('is-invalid')) {
              this.validateField(input, rules);
            }
          });
        }
      });
    },

    clearValidation(form) {
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
        const formGroup = input.closest('.form-group') || input.parentElement;
        const feedback = formGroup.querySelector('.form-feedback');
        if (feedback) {
          feedback.classList.remove('is-visible');
        }
      });
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     EMPTY STATES
     ═══════════════════════════════════════════════════════════════════════════ */

  const EmptyState = {
    templates: {
      default: {
        icon: 'fa-inbox',
        title: 'No items found',
        description: 'There are no items to display at the moment.',
        action: null
      },
      search: {
        icon: 'fa-search',
        title: 'No results found',
        description: 'Try adjusting your search or filters to find what you\'re looking for.',
        action: null
      },
      submissions: {
        icon: 'fa-folder-open',
        title: 'No submissions yet',
        description: 'Get started by submitting your first document to the Division Office.',
        action: { text: 'Create Submission', icon: 'fa-plus' }
      },
      notifications: {
        icon: 'fa-bell-slash',
        title: 'No notifications',
        description: 'You\'re all caught up! Check back later for updates.',
        action: null
      },
      error: {
        icon: 'fa-exclamation-triangle',
        title: 'Something went wrong',
        description: 'We couldn\'t load the data. Please try again later.',
        action: { text: 'Try Again', icon: 'fa-redo' }
      }
    },

    render(container, type = 'default', customOptions = {}) {
      const element = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (!element) return;

      const template = this.templates[type] || this.templates.default;
      const options = { ...template, ...customOptions };

      const actionHtml = options.action ? `
        <button class="btn btn-primary empty-state-action">
          ${options.action.icon ? `<i class="fas ${options.action.icon}"></i>` : ''}
          ${options.action.text}
        </button>
      ` : '';

      element.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon empty-state-icon-animated">
            <i class="fas ${options.icon}"></i>
          </div>
          <h3 class="empty-state-title">${options.title}</h3>
          <p class="empty-state-description">${options.description}</p>
          ${actionHtml}
        </div>
      `;

      // Attach action handler
      if (options.action && options.onAction) {
        const btn = element.querySelector('.empty-state-action');
        if (btn) {
          btn.addEventListener('click', options.onAction);
        }
      }

      return element;
    },

    compact(container, type = 'default', customOptions = {}) {
      const element = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (!element) return;

      const template = this.templates[type] || this.templates.default;
      const options = { ...template, ...customOptions };

      element.innerHTML = `
        <div class="empty-state empty-state-compact">
          <div class="empty-state-icon">
            <i class="fas ${options.icon}"></i>
          </div>
          <h3 class="empty-state-title">${options.title}</h3>
          <p class="empty-state-description">${options.description}</p>
        </div>
      `;

      return element;
    },

    clear(container) {
      const element = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (element) {
        element.innerHTML = '';
      }

      return element;
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     UTILITY FUNCTIONS
     ═══════════════════════════════════════════════════════════════════════════ */

  const Utils = {
    debounce(func, wait = 300) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    throttle(func, limit = 300) {
      let inThrottle;
      return function executedFunction(...args) {
        if (!inThrottle) {
          func(...args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    animateNumber(element, start = 0, end = 100, duration = 1000, suffix = '') {
      const obj = typeof element === 'string' ? document.querySelector(element) : element;
      if (!obj) return;

      const range = end - start;
      const minTimer = 50;
      let stepTime = Math.abs(Math.floor(duration / range));
      stepTime = Math.max(stepTime, minTimer);

      let startTime = new Date().getTime();
      let endTime = startTime + duration;
      let timer;

      const run = () => {
        let now = new Date().getTime();
        let remaining = Math.max((endTime - now) / duration, 0);
        let value = Math.round(end - (remaining * range));
        obj.textContent = value.toLocaleString() + suffix;

        if (value === end) {
          clearInterval(timer);
        }
      };

      timer = setInterval(run, stepTime);
      run();
    },

    formatDate(date, options = {}) {
      const d = new Date(date);
      const defaultOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...options
      };
      return d.toLocaleDateString('en-US', defaultOptions);
    },

    timeAgo(date) {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);

      const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 },
        { label: 'second', seconds: 1 }
      ];

      for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
          return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
        }
      }

      return 'Just now';
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    copyToClipboard(text) {
      if (navigator.clipboard) {
        return navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return Promise.resolve();
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     SIDEBAR MANAGEMENT
     ═══════════════════════════════════════════════════════════════════════════ */

  const Sidebar = {
    init(options = {}) {
      const sidebar = document.querySelector('.sidebar');
      const toggleBtn = document.querySelector(options.toggleButton || '#sidebarToggle');
      const overlay = document.querySelector('.sidebar-overlay');

      if (!sidebar) return;

      // Toggle functionality
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          sidebar.classList.toggle('collapsed');
          this._saveState(sidebar.classList.contains('collapsed'));
        });
      }

      // Mobile toggle
      const mobileToggle = document.querySelector(options.mobileToggle || '#mobileMenuToggle');
      if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
          sidebar.classList.add('active');
          if (overlay) overlay.classList.add('active');
        });
      }

      // Close on overlay click
      if (overlay) {
        overlay.addEventListener('click', () => {
          sidebar.classList.remove('active');
          overlay.classList.remove('active');
        });
      }

      // Restore state
      const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
      if (isCollapsed) {
        sidebar.classList.add('collapsed');
      }

      // Active link highlighting
      this._updateActiveLink();

      return this;
    },

    _saveState(collapsed) {
      localStorage.setItem('sidebar-collapsed', collapsed);
    },

    _updateActiveLink() {
      const currentPage = window.location.pathname.split('/').pop() || 'dashboard';
      document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
        const page = link.getAttribute('data-page');
        if (page && currentPage.includes(page)) {
          link.classList.add('active');
        }
      });
    },

    collapse() {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.add('collapsed');
        this._saveState(true);
      }
    },

    expand() {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.remove('collapsed');
        this._saveState(false);
      }
    },

    toggle() {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.toggle('collapsed');
        this._saveState(sidebar.classList.contains('collapsed'));
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════════════════════════════════ */

  return {
    // Toast notifications
    toast: ToastContainer,

    // Modal system
    modal: Modal,

    // Skeleton loading
    skeleton: Skeleton,

    // Form validation
    validator: FormValidator,

    // Empty states
    emptyState: EmptyState,

    // Sidebar management
    sidebar: Sidebar,

    // Utilities
    utils: Utils,

    // Initialize all components
    init(options = {}) {
      // Initialize sidebar if present
      if (document.querySelector('.sidebar')) {
        this.sidebar.init(options.sidebar);
      }

      // Add escape key handler for modals
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          Modal.closeAll();
        }
      });

      console.log('[ModernUI] Initialized');
      return this;
    }
  };
})();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ModernUI.init());
} else {
  ModernUI.init();
}
