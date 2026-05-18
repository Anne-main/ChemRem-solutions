# ChemRem Solutions — Website v2.0

## Project Structure

```
project/
├── backend/
│   ├── server.js       ← Secure Express API
│   └── package.json
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

## Setup & Running

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Set environment variables (IMPORTANT for production)
export ADMIN_TOKEN=your-secret-admin-token-here
export ALLOWED_ORIGINS=https://yourdomain.com
export PORT=3000

# 3. Start the server
npm start

# 4. Visit http://localhost:3000
```

## Security Improvements Made

### Backend (server.js)
| Feature | Details |
|---|---|
| Security headers | X-Content-Type-Options, X-Frame-Options, XSS-Protection, CSP, Referrer-Policy |
| Rate limiting | 5 submissions per IP per 15 min (no extra package needed) |
| Input sanitization | HTML tag stripping + HTML entity encoding on all inputs |
| Input validation | Server-side name, email, phone, message validation with detailed field errors |
| Payload size limit | `express.json({ limit: '10kb' })` prevents oversized request attacks |
| CORS hardening | Allowlist-based origin validation |
| Admin route protection | Token-based auth on GET/DELETE /api/contact |
| No sensitive data leak | IPs stripped from admin response; generic 500 error messages |
| Memory leak prevention | Rate limit store cleaned up every 30 min |
| UUID message IDs | `crypto.randomUUID()` — no sequential ID guessing |
| Request logging | IP + method + path logged to console |
| Health check | GET /api/health for monitoring |

### Frontend (script.js + index.html)
| Feature | Details |
|---|---|
| Honeypot field | Hidden `<input name="website">` — bots fill it, real users don't |
| Client-side rate limiting | 10-second cooldown between submit attempts |
| Fetch timeout | `AbortSignal.timeout(15000)` — prevents hanging requests |
| Phone number field | Optional phone with format validation |
| Character counter | Live 0/2000 counter on message field |
| Debounced validation | Validate while typing, not on every keystroke |
| ARIA live regions | Screen readers announce errors and success messages |
| aria-invalid | Set on invalid fields for assistive technology |
| aria-expanded | Set on mobile nav toggle |
| Skip link | "Skip to main content" for keyboard users |
| Escape key closes nav | Standard keyboard UX |
| Focus management | Auto-focuses first invalid field on failed submit |
| Dynamic footer year | `new Date().getFullYear()` — never stale |
| Fallback message | Network error suggests WhatsApp as fallback |

## Production Checklist

- [ ] Set `ADMIN_TOKEN` env variable to a strong random value
- [ ] Set `ALLOWED_ORIGINS` to your actual domain
- [ ] Replace Google Maps embed URL in `index.html` with your actual location
- [ ] Update phone/email/address in `index.html`
- [ ] Add HTTPS (use Nginx + Certbot, or deploy to Render/Railway/Vercel)
- [ ] Replace in-memory `messages[]` array with a real database (SQLite, Postgres, MongoDB)
- [ ] Add email notifications (Nodemailer + Gmail/SMTP) when contact form is submitted
- [ ] Set up process manager: `npm install -g pm2 && pm2 start server.js`

## Admin API Usage

```bash
# View all messages
curl "http://localhost:3000/api/contact?token=your-admin-token"

# Delete a message
curl -X DELETE "http://localhost:3000/api/contact/UUID?token=your-admin-token"

# Health check
curl "http://localhost:3000/api/health"
```
