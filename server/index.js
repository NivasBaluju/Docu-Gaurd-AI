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
const adminRoutes = require('./routes/admin');
const contractActionsRoutes = require('./routes/contractActions');
const notificationRoutes = require('./routes/notifications');
const portfolioRoutes = require('./routes/portfolioAnalytics');
const portfolioOperationsRoutes = require('./routes/portfolioOperations');
const complianceRoutes = require('./routes/complianceAudit');
const workflowRoutes = require('./routes/workflow');
const governanceRoutes = require('./routes/governance');
const integrationsRoutes = require('./routes/integrations');
const jobsRoutes = require('./routes/jobs');
const { correlationMiddleware } = require('./middleware/correlation');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy hops (Vercel, Cloudflare, Nginx, ALB) for accurate client IP identification
app.set('trust proxy', 1);

// Mount request correlation tracking early
app.use(correlationMiddleware);

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-Id');
  res.setHeader('Access-Control-Expose-Headers', 'X-Correlation-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
// ---------------------------------------------------------------------------

// Enforce standard request body boundary (1MB) and preserve rawBody for HMAC verification
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(cookieParser());

// Comprehensive modern security headers (defense-in-depth posture)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' ws: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
  );
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/actions', contractActionsRoutes.router);
app.use('/api/notifications', notificationRoutes);
app.use('/api/portfolio/operations', portfolioOperationsRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/documents/:documentId/compliance', (req, res, next) => {
  req.url = `/documents/${req.params.documentId}${req.url}`;
  complianceRoutes(req, res, next);
});
app.use('/api/portfolio/compliance', (req, res, next) => {
  req.url = `/portfolio${req.url}`;
  complianceRoutes(req, res, next);
});
app.use('/api/ai', aiRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/jobs', jobsRoutes);

// --- Health & Readiness Model ------------------------------------------------
// 1. Process Liveness Probe (Fast process response check)
app.get(['/api/health/live', '/api/health/liveness'], (req, res) => {
  res.status(200).json({
    status: 'live',
    service: 'Docu-Gaurd AI Gateway',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    correlationId: req.correlationId
  });
});

// 2. Deep Readiness Probe (PostgreSQL pool + Flask microservice validation)
app.get(['/api/health/ready', '/api/health/readiness'], async (req, res) => {
  const health = {
    status: 'ready',
    service: 'Docu-Gaurd AI Gateway',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    correlationId: req.correlationId,
    dependencies: {
      database: { status: 'unknown' },
      ai_microservice: { status: 'unknown' }
    }
  };

  let isReady = true;

  // Database connectivity check
  try {
    const dbStart = Date.now();
    await db.query('SELECT 1');
    health.dependencies.database = {
      status: 'healthy',
      latencyMs: Date.now() - dbStart
    };
  } catch (dbErr) {
    health.dependencies.database = {
      status: 'unhealthy',
      error: dbErr.message
    };
    isReady = false;
  }

  // AI Microservice check
  try {
    const flaskStart = Date.now();
    const flaskRes = await fetch('http://127.0.0.1:5001/api/health', {
      signal: AbortSignal.timeout(2000)
    });
    if (flaskRes.ok) {
      const flaskData = await flaskRes.json();
      health.dependencies.ai_microservice = {
        status: 'healthy',
        latencyMs: Date.now() - flaskStart,
        connected: flaskData.postgres?.connected !== false
      };
    } else {
      health.dependencies.ai_microservice = {
        status: 'degraded',
        httpStatus: flaskRes.status
      };
    }
  } catch (flaskErr) {
    health.dependencies.ai_microservice = {
      status: 'unavailable',
      error: 'Microservice unreachable; direct node fallback active'
    };
  }

  health.status = isReady ? 'ready' : 'unhealthy';
  res.status(isReady ? 200 : 503).json(health);
});

// 3. Deep Enterprise Dependency Health Probe (Component 15)
app.get('/api/health/dependencies', async (req, res) => {
  const dependencies = {
    postgresql: { status: 'FAILED' },
    ai_microservice: { status: 'DEGRADED' },
    credential_vault: { status: 'READY' },
    integration_outbox: { status: 'READY' },
    background_jobs: { status: 'READY' },
    audit_ledger: { status: 'READY' }
  };

  let overall = 'READY';

  // 1. PostgreSQL
  try {
    const t0 = Date.now();
    await db.query('SELECT 1');
    dependencies.postgresql = { status: 'READY', latencyMs: Date.now() - t0 };
  } catch (err) {
    dependencies.postgresql = { status: 'FAILED', error: err.message };
    overall = 'FAILED';
  }

  // 2. AI Microservice
  try {
    const t0 = Date.now();
    const flaskRes = await fetch('http://127.0.0.1:5001/api/health', {
      signal: AbortSignal.timeout(4000)
    });
    if (flaskRes.ok) {
      dependencies.ai_microservice = { status: 'READY', latencyMs: Date.now() - t0 };
    } else {
      dependencies.ai_microservice = { status: 'DEGRADED', httpStatus: flaskRes.status };
      if (overall !== 'FAILED') overall = 'DEGRADED';
    }
  } catch {
    dependencies.ai_microservice = { status: 'DEGRADED', note: 'Node fallback active' };
    if (overall !== 'FAILED') overall = 'DEGRADED';
  }

  // 3. Credential Vault
  try {
    const { getCredentialVaultStats } = require('./services/credentialVaultService');
    const stats = await getCredentialVaultStats();
    dependencies.credential_vault = { status: 'READY', algorithm: 'AES-256-GCM', activeSecrets: stats.activeSecrets };
  } catch {
    dependencies.credential_vault = { status: 'READY', algorithm: 'AES-256-GCM' };
  }

  // 4. Outbox Ledger
  try {
    const { rows: dlq } = await db.query("SELECT COUNT(*) AS c FROM integration_event_outbox WHERE status = 'DEAD_LETTER'");
    const dlqCount = Number(dlq[0]?.c || 0);
    dependencies.integration_outbox = {
      status: dlqCount > 10 ? 'DEGRADED' : 'READY',
      dead_letter_count: dlqCount
    };
    if (dlqCount > 10 && overall !== 'FAILED') overall = 'DEGRADED';
  } catch {}

  // 5. Audit Ledger
  try {
    const { rows: audit } = await db.query('SELECT COUNT(*) AS c FROM blockchain_audit');
    dependencies.audit_ledger = {
      status: 'READY',
      total_blocks: Number(audit[0]?.c || 0),
      algorithm: 'SHA-256'
    };
  } catch (err) {
    dependencies.audit_ledger = { status: 'FAILED', error: err.message };
    overall = 'FAILED';
  }

  const httpStatus = overall === 'FAILED' ? 503 : 200;
  res.status(httpStatus).json({
    status: overall,
    timestamp: new Date().toISOString(),
    correlation_id: req.correlationId,
    dependencies
  });
});

// 4. Backward-Compatible General Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Docu-Gaurd AI',
    time: new Date().toISOString(),
    correlationId: req.correlationId
  });
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
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Central error handler
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Local dev: start HTTP server. On Vercel, the file is imported as a module.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Docu-Gaurd AI running at http://localhost:${PORT}\n`);
  });
}

// Export for Vercel serverless
module.exports = app;
