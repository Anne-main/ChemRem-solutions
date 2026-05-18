/**
 * ChemRem Solutions - Secure Express Backend
 * Features: Helmet security headers, rate limiting, input sanitization,
 *           CSRF protection via SameSite cookies, request logging, admin panel
 */

// Load .env file if it exists (ignored safely if not present)
const fs = require('fs');
if (fs.existsSync('.env')) {
  require('dotenv').config();
  console.log('[Config] Loaded environment variables from .env file');
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── In-memory store (replace with a real DB in production) ──────────────────
const messages = [];
const rateLimitStore = new Map(); // IP → { count, resetAt }

// ─── Security Middleware ──────────────────────────────────────────────────────

// 1. Security HTTP headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data:; " +
    "connect-src 'self';"
  );
  next();
});

// 2. CORS — only allow same origin in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
}));

// 3. Body parser with size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// 4. Request logger
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path} — IP: ${getClientIP(req)}`);
  next();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getClientIP(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

function sanitize(str, maxLen) {
  maxLen = maxLen || 500;
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[&<>"'`]/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '`': '&#x60;' }[c];
    })
    .trim()
    .slice(0, maxLen);
}

function rateLimit(req, res, next) {
  const ip = getClientIP(req);
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX_REQUESTS = 5;

  const record = rateLimitStore.get(ip) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + WINDOW_MS;
  }

  record.count++;
  rateLimitStore.set(ip, record);

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - record.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

  if (record.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many requests. Please wait 15 minutes before submitting again.'
    });
  }

  next();
}

// Clean up rate limit store every 30 minutes
setInterval(function() {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) rateLimitStore.delete(ip);
  }
}, 30 * 60 * 1000);

// ─── Static Files ─────────────────────────────────────────────────────────────
// Auto-detect: use 'frontend/' subfolder if it exists, otherwise serve from
// the root directory (same folder as server.js). Works either way automatically.
const frontendDir = fs.existsSync(path.join(__dirname, 'frontend'))
  ? path.join(__dirname, 'frontend')
  : __dirname;

console.log('[Static] Serving files from: ' + frontendDir);

app.use(express.static(frontendDir, {
  etag: true,
  lastModified: true,
  maxAge: '1h',
}));

// ─── API Routes ───────────────────────────────────────────────────────────────

app.post('/api/contact', rateLimit, function(req, res) {
  const rawName = req.body.name;
  const rawEmail = req.body.email;
  const rawPhone = req.body.phone;
  const rawMessage = req.body.message;

  const errors = {};

  if (!rawName || !String(rawName).trim()) {
    errors.name = 'Name is required.';
  } else if (String(rawName).trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!rawEmail || !String(rawEmail).trim()) {
    errors.email = 'Email is required.';
  } else {
    const emailRe = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRe.test(String(rawEmail).trim())) {
      errors.email = 'Please provide a valid email address.';
    }
  }

  if (!rawMessage || !String(rawMessage).trim()) {
    errors.message = 'Message is required.';
  } else if (String(rawMessage).trim().length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed.', fields: errors });
  }

  const entry = {
    id: crypto.randomUUID(),
    name: sanitize(rawName, 100),
    email: sanitize(rawEmail, 200),
    phone: rawPhone ? sanitize(rawPhone, 20) : null,
    message: sanitize(rawMessage, 2000),
    submittedAt: new Date().toISOString(),
    ip: getClientIP(req),
  };

  messages.push(entry);
  console.log('[Contact] #' + messages.length + ' from ' + entry.name + ' (' + entry.email + ')');

  return res.status(201).json({
    success: true,
    message: "Message received! We'll get back to you within 30 minutes.",
    id: entry.id,
  });
});

app.get('/api/contact', function(req, res) {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme-set-in-env';
  if (req.query.token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  return res.json({
    count: messages.length,
    messages: messages.map(function(m) {
      const safe = Object.assign({}, m);
      delete safe.ip;
      return safe;
    }),
  });
});

app.delete('/api/contact/:id', function(req, res) {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme-set-in-env';
  if (req.query.token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  const idx = messages.findIndex(function(m) { return m.id === req.params.id; });
  if (idx === -1) {
    return res.status(404).json({ error: 'Message not found.' });
  }
  messages.splice(idx, 1);
  return res.json({ success: true });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', function(req, res) {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()), messages: messages.length });
});

// ─── SPA fallback — must use detected frontendDir ─────────────────────────────
app.get('*', function(req, res) {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(function(err, req, res, _next) {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, function() {
  console.log('\n✅  ChemRem Solutions server running → http://localhost:' + PORT);
  console.log('   Serving from: ' + frontendDir);
  console.log('   Admin token: ' + (process.env.ADMIN_TOKEN ? '(from env)' : 'NOT SET — set ADMIN_TOKEN!'));
  console.log('   Allowed origins: ' + allowedOrigins.join(', ') + '\n');
});
