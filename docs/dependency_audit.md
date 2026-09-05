# Deciva — Dependency & Supply Chain Audit

---

## 1. Runtime Environment Requirements

* **Node.js:** v18.0.0 or higher (LTS recommended)
* **Python:** v3.10.0 or higher (for AI microservice)
* **PostgreSQL:** v15.0 or higher (Neon Serverless or standard PostgreSQL with TLS)

---

## 2. Production Node.js Dependencies

| Package | Version | Purpose | Security Review |
| :--- | :--- | :--- | :--- |
| `express` | ^4.19.2 | Core REST API Gateway | Active, mature, rate-limited |
| `pg` | ^8.11.3 | PostgreSQL connection pool | TLS certificate verification enforced |
| `jsonwebtoken` | ^9.0.2 | Session authentication | HMAC-SHA256, expiration enforced |
| `bcryptjs` | ^2.4.3 | Password hashing (salt rounds: 12) | Timing-attack resistant |
| `dotenv` | ^16.4.5 | Environment variable configuration | Startup validation active |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing | Restricted allowed origins |
| `multer` | ^1.4.5-lts.1 | Multipart file uploads | Size limits enforced (50MB) |
| `nodemailer` | ^6.9.13 | Transactional notifications | TLS-authenticated SMTP |
| `otplib` | ^12.0.1 | TOTP Two-Factor Authentication | RFC 6238 compliant |
| `qrcode` | ^1.5.3 | MFA QR Code generation | Pure SVG/DataURL rendering |

---

## 3. Frontend Production Dependencies

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `react` | ^18.2.0 | Reactive component architecture |
| `react-dom` | ^18.2.0 | DOM rendering layer |
| `react-router-dom` | ^6.22.3 | Client-side routing with HashRouter |
| `lucide-react` | ^0.359.0 | High-legibility UI iconography |
| `canvas-confetti` | ^1.9.2 | Celebration micro-interactions |

---

## 4. Build & Development Tooling

* `vite` (^5.1.6): Fast production bundler with Rollup/Rolldown chunking.
* `@vitejs/plugin-react` (^4.2.1): Fast Refresh and JSX transformation.
* `playwright` (^1.57.0): End-to-end browser automation framework (optional external browser binary).

---

## 5. Vulnerability & Safety Assertions

* **Zero Plaintext Secrets:** Passwords and keys encrypted via AES-256-GCM.
* **Timing Attacks Eliminated:** Constant-time comparisons (`crypto.timingSafeEqual`) on HMAC and auth tokens.
* **XSS Defense:** Strict React string interpolation; raw HTML injection eliminated from document viewers.
