require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const db = require('./db'); // eslint-disable-line no-unused-vars -- initializes schema
const { recordAudit } = require('./utils/audit');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const aiRoutes = require('./routes/ai');
const contractRoutes = require('./routes/contracts');
const securityRoutes = require('./routes/security');
const shareRoutes = require('./routes/share');

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS -------------------------------------------------------------------
// Allow the Vercel-hosted frontend and local dev to reach the API.
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,           // e.g. https://docu-gaurd-ai.vercel.app
  'http://localhost:5000',
  'http://localhost:3000',
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
// ---------------------------------------------------------------------------

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Basic security headers (zero-trust posture) without extra dependencies.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/share', shareRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Docu-Gaurd AI', time: new Date().toISOString() });
});

// Bootstrap genesis audit block on first run.
(async () => {
  try {
    const { rows } = await db.query('SELECT COUNT(*) AS c FROM blockchain_audit');
    if (Number(rows[0].c) === 0) {
      await recordAudit(null, 'SYSTEM_INITIALIZED', { message: 'Docu-Gaurd AI audit ledger initialized' });
    }
  } catch (e) {
    console.error('Failed to initialize audit ledger:', e.message);
  }
})();

// Serve frontend SPA (React production build or legacy fallback)
const distDir = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');
const staticDir = fs.existsSync(distDir) ? distDir : publicDir;

app.use(express.static(staticDir));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Local dev: start HTTP server. On Vercel, the file is imported as a module.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Docu-Gaurd AI running at http://localhost:${PORT}\n`);
  });
}

// Export for Vercel serverless
module.exports = app;
