# Docu-Gaurd AI — Enterprise AI Legal Copilot

A full-stack, security-first AI legal copilot: clause extraction, plain-language
translation, a RAG chatbot, a negotiation assistant, a compliance checker, a
contract generator, version diffing, and deadline extraction — wrapped in
real AES-256-GCM encryption, SHA-256 integrity checks, zero-trust session
scoring, TOTP + email MFA, an immutable hash-chained audit ledger, and RSA
digital signatures.

Everything in this build **actually runs** — there is no mock backend. The
AI features use a fast, fully offline, rule/heuristic NLP engine (regex +
keyword + retrieval scoring), so the app works out of the box with **no API
key required**. See "Using real LLM-powered AI" below if you'd like to swap
in Claude for deeper analysis.

## 1. Requirements

- Node.js 18+ (tested on Node 22)
- npm

## 2. Setup

```bash
cd docu-gaurd-ai
npm install
cp .env.example .env
```

Open `.env` and, at minimum, change `JWT_SECRET` to a long random string.
Everything else has safe defaults (an AES-256 key and RSA signing keypair
are auto-generated on first run and stored in `data/db/`).

## 3. Run

```bash
npm start
```

Then open **http://localhost:5000** in your browser.

The server runs a single Express process that serves both the REST API
(`/api/...`) and the frontend SPA (static files in `public/`) on port 5000,
matching the original implementation plan.

## 4. First use

1. Register an account (`/api/auth/register` via the UI's "Get Started").
2. Log in. Optionally enable TOTP MFA from **Security Center → Enable MFA**
   (scan the QR code with Google Authenticator / Authy).
3. Upload a `.txt`, `.pdf`, or `.docx` contract from **Upload**.
4. Explore the document's tabs: Overview (clause extraction + plain-language
   translation), Chat (RAG Q&A), Negotiation, Risk, Compliance, Deadlines,
   and PII.
5. Generate a contract from **Contract Generator**, compare two document
   versions from **Documents**, and review the immutable audit ledger and
   active sessions in **Security Center**.

## 5. What's real vs. simulated

**Fully real, using standard cryptographic libraries (Node's `crypto`):**
- AES-256-GCM encryption of every uploaded file at rest
- SHA-256 hashing + integrity verification
- bcrypt password hashing, JWT sessions, TOTP MFA (RFC 6238), email OTP
- RSA-2048 digital signatures on generated contracts
- A genuine hash-chained ("blockchain-style") audit ledger — each block's
  hash is derived from the previous block's hash, and `/api/security/audit/verify`
  recomputes every hash to detect tampering
- Zero-trust session scoring based on device/network fingerprint, MFA
  status, and session age

**Real but heuristic (no external AI API — works fully offline):**
- Clause extraction, plain-language simplification, RAG-style document
  Q&A, risk scoring, negotiation suggestions, compliance checks, deadline
  extraction, and PII detection/redaction all use pattern-matching,
  keyword scoring, and retrieval — not a large language model. They give
  genuinely useful, deterministic results on real contracts, but should not
  be treated as a substitute for professional legal review.

**Limitation:** OCR for scanned images isn't bundled (no OCR engine ships
in this build to keep install size small). Upload `.txt`, `.pdf`, or
`.docx` files for full text analysis.

## 6. Using real LLM-powered AI (optional)

If you'd like genuine LLM reasoning instead of the heuristic engine, set
`ANTHROPIC_API_KEY` in `.env` and wire `server/utils/aiEngine.js` calls
through the Anthropic Messages API — the heuristic functions are designed
as drop-in replaceable modules (same input/output shape) to make this easy.

## 7. Email OTP delivery

By default there's no SMTP configured, so email OTP codes are printed to
the server console and also returned in the API response labeled "DEV
MODE" so you can test the flow without setting up email. To send real
emails, fill in `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, etc. in `.env`
(e.g. a Gmail App Password).

## 8. Project structure

```
docu-gaurd-ai/
  server/
    index.js              Express app entrypoint
    db.js                 PostgreSQL connection pool and schema initialization (pg)
    middleware/auth.js     JWT + zero-trust session middleware
    routes/                auth, documents, ai, contracts, security, share
    utils/
      crypto.js            AES-256-GCM, SHA-256, RSA signing
      audit.js             Hash-chained audit ledger
      aiEngine.js           Heuristic AI engine (clauses, RAG, risk, etc.)
      contractTemplates.js Contract generation templates
  public/
    index.html, css/, js/  Single-page frontend (vanilla JS, no build step)
  data/
    uploads/                Encrypted document blobs
    db/                     SQLite file, master key, RSA keypair (gitignored)
```

## 9. Notes

- This build uses plain JavaScript/HTML/CSS on the frontend (no build step,
  no bundler) — just open the served page and it works.
- Database connection is configured via `DATABASE_URL` in `.env` using PostgreSQL (`pg`).
