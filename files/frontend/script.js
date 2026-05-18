/**
 * ChemRem Solutions — Frontend Script
 * Improvements: honeypot bot detection, phone field, character counter,
 *               debounced validation, submission cooldown, accessibility,
 *               dynamic footer year, and better error handling.
 */

'use strict';

// ─── Utility ─────────────────────────────────────────────────────────────────

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Footer year ─────────────────────────────────────────────────────────────
const yearEl = document.getElementById('footerYear');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ─── Navbar scroll effect ─────────────────────────────────────────────────────
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ─── Mobile nav toggle ────────────────────────────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
  // Trap focus in menu when open
  if (isOpen) navLinks.querySelector('a')?.focus();
});

// Close mobile menu when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navLinks.classList.contains('open')) {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.focus();
  }
});

// ─── Active nav link on scroll ───────────────────────────────────────────────
const sections   = document.querySelectorAll('.section');
const navAnchors = navLinks.querySelectorAll('a');

function updateActiveLink() {
  let current = '';
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 120) {
      current = section.getAttribute('id');
    }
  });
  navAnchors.forEach(a => {
    const matches = a.getAttribute('href') === `#${current}`;
    a.classList.toggle('active', matches);
    a.setAttribute('aria-current', matches ? 'page' : 'false');
  });
}

window.addEventListener('scroll', debounce(updateActiveLink, 60), { passive: true });

// ─── Scroll reveal ────────────────────────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll(
  '.service-card, .product-card, .stat-card, .contact-item, .about-text, .about-stats, .contact-form, .contact-info'
).forEach(el => {
  el.classList.add('reveal');
  revealObserver.observe(el);
});

// ─── Counter animation ────────────────────────────────────────────────────────
const statNumbers = document.querySelectorAll('.stat-number[data-target]');

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target, parseInt(entry.target.dataset.target, 10));
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

statNumbers.forEach(el => counterObserver.observe(el));

function animateCounter(el, target) {
  const duration = 1800;
  const start    = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ─── Contact Form ─────────────────────────────────────────────────────────────
const contactForm  = document.getElementById('contactForm');
const submitBtn    = document.getElementById('submitBtn');
const submitText   = document.getElementById('submitText');
const submitSpinner = document.getElementById('submitSpinner');
const formStatus   = document.getElementById('formStatus');

const nameInput    = document.getElementById('name');
const emailInput   = document.getElementById('email');
const phoneInput   = document.getElementById('phone');
const messageInput = document.getElementById('message');
const hpInput      = document.getElementById('website'); // honeypot
const charCount    = document.getElementById('charCount');

const nameError    = document.getElementById('nameError');
const emailError   = document.getElementById('emailError');
const phoneError   = document.getElementById('phoneError');
const messageError = document.getElementById('messageError');

// Character counter for message
messageInput.addEventListener('input', () => {
  const len = messageInput.value.length;
  charCount.textContent = `${len} / 2000`;
  charCount.classList.toggle('near-limit', len > 1800);
});

// ── Validators ───────────────────────────────────────────────────────────────

function validateName() {
  const val = nameInput.value.trim();
  if (!val) {
    setError(nameInput, nameError, 'Name is required.');
    return false;
  }
  if (val.length < 2) {
    setError(nameInput, nameError, 'Name must be at least 2 characters.');
    return false;
  }
  clearError(nameInput, nameError);
  return true;
}

function validateEmail() {
  const val = emailInput.value.trim();
  if (!val) {
    setError(emailInput, emailError, 'Email is required.');
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
    setError(emailInput, emailError, 'Please enter a valid email address.');
    return false;
  }
  clearError(emailInput, emailError);
  return true;
}

function validatePhone() {
  const val = phoneInput.value.trim();
  if (!val) {
    clearError(phoneInput, phoneError);
    return true; // optional field
  }
  if (!/^[\d\s\+\-\(\)]{7,20}$/.test(val)) {
    setError(phoneInput, phoneError, 'Please enter a valid phone number.');
    return false;
  }
  clearError(phoneInput, phoneError);
  return true;
}

function validateMessage() {
  const val = messageInput.value.trim();
  if (!val) {
    setError(messageInput, messageError, 'Message is required.');
    return false;
  }
  if (val.length < 10) {
    setError(messageInput, messageError, 'Message must be at least 10 characters.');
    return false;
  }
  clearError(messageInput, messageError);
  return true;
}

function setError(input, errorEl, msg) {
  input.classList.add('invalid');
  input.setAttribute('aria-invalid', 'true');
  errorEl.textContent = msg;
}

function clearError(input, errorEl) {
  input.classList.remove('invalid');
  input.setAttribute('aria-invalid', 'false');
  errorEl.textContent = '';
}

// ── Live validation on blur (debounced on input) ──────────────────────────────
nameInput.addEventListener('blur', validateName);
emailInput.addEventListener('blur', validateEmail);
phoneInput.addEventListener('blur', validatePhone);
messageInput.addEventListener('blur', validateMessage);

nameInput.addEventListener('input',    debounce(validateName,    300));
emailInput.addEventListener('input',   debounce(validateEmail,   400));
phoneInput.addEventListener('input',   debounce(validatePhone,   300));
messageInput.addEventListener('input', debounce(validateMessage, 300));

// ── Submission ────────────────────────────────────────────────────────────────
let lastSubmitTime = 0;
const SUBMIT_COOLDOWN_MS = 10000; // 10 seconds between attempts

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1. Honeypot check — if filled, silently reject (bot)
  if (hpInput && hpInput.value.trim() !== '') {
    showFormStatus('Message sent!', 'success'); // fake success for bots
    return;
  }

  // 2. Validate all fields
  const valid = [validateName(), validateEmail(), validatePhone(), validateMessage()];
  if (valid.includes(false)) {
    // Focus the first invalid field
    const firstInvalid = contactForm.querySelector('.invalid');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  // 3. Client-side cooldown to prevent double-submit
  const now = Date.now();
  if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
    showFormStatus('Please wait a moment before sending again.', 'error');
    return;
  }

  // 4. UI loading state
  submitBtn.disabled = true;
  submitText.textContent = 'Sending…';
  submitSpinner.style.display = 'inline-block';
  formStatus.className = 'form-status';
  formStatus.textContent = '';

  try {
    const payload = {
      name:    nameInput.value.trim(),
      email:   emailInput.value.trim(),
      phone:   phoneInput.value.trim() || undefined,
      message: messageInput.value.trim(),
    };

    const response = await fetch('/api/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(15000), // 15-second timeout
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showFormStatus('✓ Message sent! We\'ll get back to you within 30 minutes.', 'success');
      contactForm.reset();
      charCount.textContent = '0 / 2000';
      lastSubmitTime = Date.now();
      // Clear all error states after successful reset
      [nameInput, emailInput, phoneInput, messageInput].forEach(inp => {
        inp.classList.remove('invalid');
        inp.removeAttribute('aria-invalid');
      });
    } else if (data.fields) {
      // Server-side field errors — display them
      const fieldMap = { name: [nameInput, nameError], email: [emailInput, emailError], message: [messageInput, messageError] };
      Object.entries(data.fields).forEach(([field, msg]) => {
        if (fieldMap[field]) setError(fieldMap[field][0], fieldMap[field][1], msg);
      });
      showFormStatus('Please fix the errors above.', 'error');
    } else {
      showFormStatus(data.error || 'Something went wrong. Please try again.', 'error');
    }
  } catch (err) {
    if (err.name === 'TimeoutError') {
      showFormStatus('Request timed out. Please check your connection and try again.', 'error');
    } else if (err.name === 'TypeError') {
      // Network error — fallback to WhatsApp
      showFormStatus(
        'Could not reach the server. Please try WhatsApp or call us directly.',
        'error'
      );
    } else {
      showFormStatus('An unexpected error occurred. Please try again.', 'error');
    }
    console.error('[Form Error]', err);
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = 'Send Message';
    submitSpinner.style.display = 'none';
  }
});

function showFormStatus(msg, type) {
  formStatus.textContent = msg;
  formStatus.className = `form-status visible ${type}`;
  // Scroll into view on mobile
  formStatus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (type === 'success') {
    setTimeout(() => { formStatus.className = 'form-status'; }, 8000);
  }
}
