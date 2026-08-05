// =============================================================================
// LexSecure AI — Frontend Application
// =============================================================================
const State = {
  user: null,
  trust: null,
  documents: [],
  currentDoc: null
};

function toast(message, type = 'info') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast glass badge-${type === 'error' ? 'danger' : type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function esc(str) {
  return (str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso.includes('Z') || iso.includes('+') ? iso : iso + 'Z').toLocaleString();
}

function fmtBytes(n) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const Router = {
  routes: {},
  register(path, handler) { this.routes[path] = handler; },
  go(hash) { window.location.hash = hash; },
  async resolve() {
    const hash = window.location.hash || '#/';
    const [path, ...rest] = hash.split('/').filter((_, i) => i === 0 || true);
    const parts = hash.replace('#/', '').split('/').filter(Boolean);
    const base = '#/' + (parts[0] || '');

    renderNav(base);

    const protectedRoutes = ['#/dashboard', '#/upload', '#/documents', '#/document', '#/compare', '#/contracts', '#/deadlines', '#/security', '#/share'];
    if (protectedRoutes.includes(base) && !State.user) {
      Router.go('#/login');
      return;
    }

    const handler = this.routes[base] || this.routes['#/notfound'];
    const app = document.getElementById('app');
    app.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    try {
      await handler(parts.slice(1));
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="empty-state"><div class="icon">⚠</div><p>${esc(e.message || 'Something went wrong')}</p></div>`;
    }
  }
};
window.addEventListener('hashchange', () => Router.resolve());

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------
function renderNav(active) {
  const nav = document.getElementById('topnav');
  const actions = document.getElementById('topbar-actions');

  if (State.user) {
    nav.innerHTML = [
      ['#/dashboard', 'Dashboard'],
      ['#/documents', 'Documents'],
      ['#/upload', 'Upload'],
      ['#/contracts', 'Contract Generator'],
      ['#/deadlines', 'Deadlines'],
      ['#/security', 'Security Center']
    ].map(([href, label]) => `<button class="${active === href ? 'active' : ''}" onclick="Router.go('${href}')">${label}</button>`).join('');

    actions.innerHTML = `
      <span class="badge badge-${State.trust >= 70 ? 'ok' : State.trust >= 40 ? 'warn' : 'danger'}">⛨ Trust ${State.trust ?? '—'}</span>
      <span class="text-mid small">${esc(State.user.name)}</span>
      <button class="btn btn-ghost btn-sm" onclick="logout()">Logout</button>
    `;
  } else {
    nav.innerHTML = '';
    actions.innerHTML = `<button class="btn btn-ghost btn-sm" onclick="Router.go('#/login')">Log In</button>
      <button class="btn btn-primary btn-sm" onclick="Router.go('#/register')">Get Started</button>`;
  }
}

async function logout() {
  try { await Api.post('/api/auth/logout'); } catch (e) {}
  Api.clearToken();
  State.user = null;
  toast('Logged out securely', 'ok');
  Router.go('#/');
}

async function refreshMe() {
  if (!Api.getToken()) return;
  try {
    const { user, trust } = await Api.get('/api/auth/me');
    State.user = user;
    State.trust = trust.score;
  } catch (e) {
    Api.clearToken();
    State.user = null;
  }
}

// =============================================================================
// VIEW: Landing
// =============================================================================
Router.register('#/', async () => {
  document.getElementById('app').innerHTML = `
    <section class="hero">
      <span class="badge badge-info">SOC 2-style security architecture · AES-256 · Zero-Trust</span>
      <h1>The <span>AI Legal Copilot</span><br/>built for enterprise security</h1>
      <p>Clause extraction, plain-language translation, negotiation assistance, compliance checking and contract generation — wrapped in bank-grade encryption, an immutable audit ledger, and zero-trust session validation.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="Router.go('${State.user ? '#/dashboard' : '#/register'}')">🚀 ${State.user ? 'Go to Dashboard' : 'Get Started Free'}</button>
        <button class="btn btn-ghost" onclick="Router.go('#/upload')">📄 Analyze a Document</button>
      </div>
      <div class="security-badges">
        ${['AES-256-GCM', 'SHA-256 Integrity', 'Zero-Trust Sessions', 'TOTP + Email MFA', 'Immutable Audit Ledger', 'Digital Signatures'].map(b => `<span class="badge badge-info">${b}</span>`).join('')}
      </div>
    </section>

    <div class="stat-counters">
      <div class="stat-counter"><div class="num" data-count="9">0</div><div class="label">AI Capabilities</div></div>
      <div class="stat-counter"><div class="num" data-count="256">0</div><div class="label">-bit AES Encryption</div></div>
      <div class="stat-counter"><div class="num" data-count="5">0</div><div class="label">Compliance Frameworks</div></div>
      <div class="stat-counter"><div class="num" data-count="100">0</div><div class="label">% Client-Owned Data</div></div>
    </div>

    <div class="feature-grid">
      ${featureCard('🧩', 'Clause Extraction', 'Automatically identify parties, payment terms, termination, confidentiality, IP, and jurisdiction clauses.')}
      ${featureCard('💬', 'Plain-Language Translation', 'Convert dense legalese into language anyone can understand.')}
      ${featureCard('🤖', 'RAG Chatbot', 'Ask questions about any document and get cited, confidence-scored answers.')}
      ${featureCard('⚖️', 'Negotiation Assistant', 'Flag high-risk clauses with one-click suggested replacement language.')}
      ${featureCard('📊', 'Risk Analysis', 'A 0-100 risk score broken down by termination, liability, confidentiality & payment.')}
      ${featureCard('✅', 'Compliance Checker', 'Real-time evaluation against Indian Contract Act, IT Act, GDPR & more.')}
      ${featureCard('🔀', 'Version Comparison', 'Side-by-side diffing that highlights legal impact of every change.')}
      ${featureCard('📝', 'Contract Generator', 'Step-by-step wizard producing signed, ready-to-use legal contracts.')}
      ${featureCard('🛡️', 'PII Redaction', 'Detect and mask Aadhaar, PAN, passport, phone, email & card numbers instantly.')}
    </div>
  `;
  animateCounters();
});

function featureCard(icon, title, desc) {
  return `<div class="glass feature-card"><div class="icon">${icon}</div><h3>${title}</h3><p>${desc}</p></div>`;
}

function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = Number(el.dataset.count);
    let cur = 0;
    const step = Math.max(1, Math.round(target / 40));
    const iv = setInterval(() => {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(iv); }
      el.textContent = cur;
    }, 20);
  });
}

// =============================================================================
// VIEW: Register / Login / MFA
// =============================================================================
Router.register('#/register', async () => {
  document.getElementById('app').innerHTML = `
    <div class="auth-wrap glass card">
      <h2 class="section-heading">Create your account</h2>
      <p class="section-sub">Enterprise-grade legal AI, secured end to end.</p>
      <form id="regForm">
        <label>Full name</label><input name="name" required />
        <label>Email</label><input type="email" name="email" required />
        <label>Password</label><input type="password" name="password" minlength="8" required />
        <p class="helper-text">Minimum 8 characters. Stored using bcrypt (12 rounds) — never in plain text.</p>
        <button class="btn btn-primary btn-block mt-16" type="submit">Create Account</button>
      </form>
      <p class="helper-text mt-16">Already have an account? <a href="#/login">Log in</a></p>
    </div>
  `;
  document.getElementById('regForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await Api.post('/api/auth/register', Object.fromEntries(fd));
      toast('Account created — please log in', 'ok');
      Router.go('#/login');
    } catch (err) { toast(err.message, 'error'); }
  };
});

Router.register('#/login', async () => {
  document.getElementById('app').innerHTML = `
    <div class="auth-wrap glass card">
      <h2 class="section-heading">Welcome back</h2>
      <p class="section-sub">Zero-trust session validation begins at login.</p>
      <form id="loginForm">
        <label>Email</label><input type="email" name="email" required />
        <label>Password</label><input type="password" name="password" required />
        <button class="btn btn-primary btn-block mt-16" type="submit">Log In</button>
      </form>
      <p class="helper-text mt-16">No account? <a href="#/register">Sign up</a></p>
    </div>
  `;
  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const result = await Api.post('/api/auth/login', Object.fromEntries(fd));
      if (result.mfaRequired) {
        sessionStorage.setItem('preToken', result.preToken);
        Router.go('#/mfa');
        return;
      }
      Api.setToken(result.token);
      await refreshMe();
      toast('Logged in securely', 'ok');
      Router.go('#/dashboard');
    } catch (err) { toast(err.message, 'error'); }
  };
});

Router.register('#/mfa', async () => {
  const preToken = sessionStorage.getItem('preToken');
  if (!preToken) { Router.go('#/login'); return; }
  document.getElementById('app').innerHTML = `
    <div class="auth-wrap glass card">
      <h2 class="section-heading">Multi-Factor Verification</h2>
      <p class="section-sub">Enter your 6-digit authenticator code, or request an email OTP instead.</p>
      <form id="totpForm">
        <label>Authenticator code</label><input name="code" maxlength="6" inputmode="numeric" required autofocus />
        <button class="btn btn-primary btn-block mt-16" type="submit">Verify & Log In</button>
      </form>
      <button class="btn btn-ghost btn-block mt-16" id="reqOtpBtn">📧 Send Email OTP instead</button>
      <div id="otpArea"></div>
    </div>
  `;
  document.getElementById('totpForm').onsubmit = async (e) => {
    e.preventDefault();
    const code = new FormData(e.target).get('code');
    try {
      const result = await Api.post('/api/auth/mfa/totp/verify', { preToken, code });
      Api.setToken(result.token);
      sessionStorage.removeItem('preToken');
      await refreshMe();
      toast('MFA verified — logged in', 'ok');
      Router.go('#/dashboard');
    } catch (err) { toast(err.message, 'error'); }
  };
  document.getElementById('reqOtpBtn').onclick = async () => {
    try {
      const r = await Api.post('/api/auth/mfa/otp/request', { preToken });
      document.getElementById('otpArea').innerHTML = `
        <form id="otpForm" class="mt-16">
          <label>Email OTP code ${r.devMode ? `<span class="badge badge-warn">DEV MODE: ${r.devCode}</span>` : ''}</label>
          <input name="code" maxlength="6" inputmode="numeric" required />
          <button class="btn btn-primary btn-block mt-16" type="submit">Verify OTP</button>
        </form>`;
      document.getElementById('otpForm').onsubmit = async (e) => {
        e.preventDefault();
        const code = new FormData(e.target).get('code');
        try {
          const result = await Api.post('/api/auth/mfa/otp/verify', { preToken, code });
          Api.setToken(result.token);
          sessionStorage.removeItem('preToken');
          await refreshMe();
          toast('MFA verified — logged in', 'ok');
          Router.go('#/dashboard');
        } catch (err) { toast(err.message, 'error'); }
      };
      toast(r.devMode ? 'Dev mode: OTP shown on screen (no SMTP configured)' : 'OTP sent to your email', 'info');
    } catch (err) { toast(err.message, 'error'); }
  };
});

// =============================================================================
// VIEW: Dashboard (SOC)
// =============================================================================
Router.register('#/dashboard', async () => {
  const d = await Api.get('/api/security/dashboard');
  const audit = await Api.get('/api/security/audit?limit=6');

  document.getElementById('app').innerHTML = `
    <h2 class="section-heading">Security Operations Center</h2>
    <p class="section-sub">Live overview of your documents, AI activity, and system security posture.</p>

    <div class="grid grid-4">
      ${metricCard('📁', d.documentsUploaded, 'Uploaded Documents')}
      ${metricCard('⚠️', d.avgRiskScore + '%', 'Avg. Risk Score', d.avgRiskScore > 50 ? 'danger' : d.avgRiskScore > 25 ? 'warn' : 'ok')}
      ${metricCard('🛡️', d.trustScore, 'Zero-Trust Score', d.trustScore >= 70 ? 'ok' : d.trustScore >= 40 ? 'warn' : 'danger')}
      ${metricCard('🚨', d.threatAlerts, 'Threat Alerts', d.threatAlerts > 0 ? 'warn' : 'ok')}
    </div>

    <div class="grid grid-4 mt-16">
      ${metricCard('💬', d.chatInteractions, 'AI Chat Interactions')}
      ${metricCard('📝', d.contractsGenerated, 'Contracts Generated')}
      ${metricCard('🔐', d.activeSessions, 'Active Sessions')}
      ${metricCard('✅', d.complianceGauge + '%', 'Compliance Gauge', 'ok')}
    </div>

    <div class="grid grid-2 mt-24">
      <div class="glass card">
        <div class="card-title"><span class="dot"></span>Immutable Audit Ledger</div>
        <p class="text-mid small">Chain integrity: <span class="badge ${d.auditLedger.valid ? 'badge-ok' : 'badge-danger'}">${d.auditLedger.valid ? 'VERIFIED ✓' : 'TAMPERED ✗'}</span> · ${d.auditLedger.totalBlocks} blocks</p>
        ${audit.blocks.map(auditBlockHtml).join('')}
        <button class="btn btn-ghost btn-sm mt-16" onclick="Router.go('#/security')">View Full Ledger →</button>
      </div>
      <div class="glass card">
        <div class="card-title"><span class="dot"></span>Quick Actions</div>
        <div class="grid" style="gap:10px">
          <button class="btn btn-primary" onclick="Router.go('#/upload')">📤 Upload & Analyze Document</button>
          <button class="btn btn-ghost" onclick="Router.go('#/contracts')">📝 Generate a Contract</button>
          <button class="btn btn-ghost" onclick="Router.go('#/deadlines')">📅 View Deadlines</button>
          <button class="btn btn-ghost" onclick="Router.go('#/security')">🛡️ Security Center</button>
        </div>
      </div>
    </div>
  `;
});

function metricCard(icon, value, label, tone) {
  const color = tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'var(--warn)' : tone === 'ok' ? 'var(--ok)' : 'var(--cyan)';
  return `<div class="glass card">
    <div style="font-size:20px">${icon}</div>
    <div class="metric-value" style="color:${color}">${value}</div>
    <div class="metric-label">${label}</div>
  </div>`;
}

function auditBlockHtml(b) {
  return `<div class="audit-block">
    <span class="action">#${b.block_index} ${b.action}</span><br/>
    ${fmtDate(b.created_at)}<br/>
    hash: ${b.hash.slice(0, 24)}…
  </div>`;
}

// =============================================================================
// VIEW: Upload
// =============================================================================
Router.register('#/upload', async () => {
  document.getElementById('app').innerHTML = `
    <h2 class="section-heading">Upload & Secure a Document</h2>
    <p class="section-sub">Files are hashed (SHA-256), encrypted at rest (AES-256-GCM), and text-extracted for AI analysis. Supported: .txt, .pdf, .docx</p>
    <div class="glass card">
      <div class="dropzone" id="dropzone">
        <div class="icon">⬆</div>
        <p><strong>Drag & drop</strong> a file here, or click to browse</p>
        <p class="text-lo small">Max 25MB</p>
        <input type="file" id="fileInput" style="display:none" accept=".txt,.pdf,.docx,.doc,image/*" />
      </div>
      <div id="uploadProgress" class="hidden">
        <div class="progress-bar"><div id="progressFill" style="width:0%"></div></div>
        <p id="progressLabel" class="text-mid small mt-8">Scanning…</p>
      </div>
      <div id="uploadResult" class="mt-16"></div>
    </div>
  `;

  const dz = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  dz.onclick = () => fileInput.click();
  dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('drag'); };
  dz.ondragleave = () => dz.classList.remove('drag');
  dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('drag'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
  fileInput.onchange = () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); };

  async function handleFile(file) {
    const progress = document.getElementById('uploadProgress');
    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressLabel');
    progress.classList.remove('hidden');
    document.getElementById('uploadResult').innerHTML = '';

    const steps = [
      [20, 'Computing SHA-256 hash…'],
      [45, 'Encrypting with AES-256-GCM…'],
      [70, 'Extracting text (OCR/parse)…'],
      [90, 'Running AI risk scan…']
    ];
    for (const [pct, msg] of steps) {
      fill.style.width = pct + '%'; label.textContent = msg;
      await new Promise(r => setTimeout(r, 250));
    }

    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await Api.upload('/api/documents/upload', fd);
      fill.style.width = '100%'; label.textContent = 'Complete.';
      document.getElementById('uploadResult').innerHTML = `
        <div class="glass card" style="border-color: var(--ok)">
          <div class="card-title"><span class="dot" style="background:var(--ok)"></span>Upload Secured</div>
          <p><strong>${esc(result.name)}</strong> · ${fmtBytes(result.size)}</p>
          <p class="text-mid small mono">SHA-256: ${result.sha256}</p>
          <p class="mt-8">
            <span class="badge badge-ok">AES-256 Encrypted</span>
            <span class="badge badge-info">OCR Confidence: ${Math.round(result.ocrConfidence * 100)}%</span>
            <span class="badge ${result.riskScore > 50 ? 'badge-danger' : result.riskScore > 25 ? 'badge-warn' : 'badge-ok'}">Risk Score: ${result.riskScore ?? '—'}</span>
          </p>
          <button class="btn btn-primary mt-16" onclick="Router.go('#/document/${result.id}')">Open AI Analysis →</button>
        </div>
      `;
      toast('Document uploaded and secured', 'ok');
    } catch (err) {
      progress.classList.add('hidden');
      toast(err.message, 'error');
    }
  }
});

// =============================================================================
// VIEW: Documents list
// =============================================================================
Router.register('#/documents', async () => {
  const { documents } = await Api.get('/api/documents');
  State.documents = documents;

  document.getElementById('app').innerHTML = `
    <div class="flex-between">
      <div>
        <h2 class="section-heading">Your Documents</h2>
        <p class="section-sub">All files are encrypted at rest with AES-256-GCM.</p>
      </div>
      <button class="btn btn-primary" onclick="Router.go('#/upload')">+ Upload</button>
    </div>
    <div class="glass card">
      ${documents.length === 0 ? emptyState('📁', 'No documents yet', 'Upload your first contract to begin AI analysis.') :
        documents.map(docRowHtml).join('')}
    </div>
    ${documents.length >= 2 ? `
    <div class="glass card mt-24">
      <div class="card-title"><span class="dot"></span>Compare Versions</div>
      <div class="grid grid-2">
        <div><label>Document A</label><select id="cmpA">${documents.map(d => `<option value="${d.id}">${esc(d.original_name)}</option>`).join('')}</select></div>
        <div><label>Document B</label><select id="cmpB">${documents.map((d, i) => `<option value="${d.id}" ${i === 1 ? 'selected' : ''}>${esc(d.original_name)}</option>`).join('')}</select></div>
      </div>
      <button class="btn btn-primary mt-16" onclick="runCompare()">🔀 Compare Documents</button>
      <div id="compareResult" class="mt-16"></div>
    </div>` : ''}
  `;
});

function docRowHtml(d) {
  return `<div class="doc-row" onclick="Router.go('#/document/${d.id}')">
    <div>
      <div class="doc-name">${esc(d.original_name)}</div>
      <div class="doc-meta">${fmtBytes(d.size)} · uploaded ${fmtDate(d.created_at)} · SHA-256 ${d.sha256.slice(0, 12)}…</div>
    </div>
    <div class="flex gap-8">
      ${d.risk_score != null ? `<span class="badge ${d.risk_score > 50 ? 'badge-danger' : d.risk_score > 25 ? 'badge-warn' : 'badge-ok'}">Risk ${d.risk_score}</span>` : ''}
      <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); deleteDoc('${d.id}')">🗑</button>
    </div>
  </div>`;
}

async function deleteDoc(id) {
  if (!confirm('Delete this document permanently?')) return;
  try {
    await Api.del(`/api/documents/${id}`);
    toast('Document deleted', 'ok');
    Router.resolve();
  } catch (e) { toast(e.message, 'error'); }
}

async function runCompare() {
  const a = document.getElementById('cmpA').value;
  const b = document.getElementById('cmpB').value;
  if (a === b) { toast('Choose two different documents', 'error'); return; }
  try {
    const result = await Api.post('/api/ai/compare', { documentIdA: a, documentIdB: b });
    document.getElementById('compareResult').innerHTML = `
      <p class="text-mid small">Comparing <strong>${esc(result.docA)}</strong> → <strong>${esc(result.docB)}</strong> · ${result.totalChanges} changes detected</p>
      ${result.changes.length === 0 ? '<p class="text-lo">No differences detected.</p>' :
        result.changes.map(c => `
          <div class="diff-item ${c.type}">
            <span class="badge ${c.type === 'added' ? 'badge-ok' : 'badge-danger'}">${c.type.toUpperCase()}</span>
            <span class="badge badge-info">${esc(c.section)}</span>
            <p style="margin:8px 0 0">${esc(c.text)}</p>
            <span class="diff-impact">${esc(c.impact)}</span>
          </div>`).join('')}
    `;
  } catch (e) { toast(e.message, 'error'); }
}

function emptyState(icon, title, sub) {
  return `<div class="empty-state"><div class="icon">${icon}</div><h3>${title}</h3><p>${sub}</p></div>`;
}

// =============================================================================
// VIEW: Document detail (split-screen viewer + AI tabs)
// =============================================================================
const DOC_TABS = ['overview', 'chat', 'negotiation', 'risk', 'compliance', 'deadlines', 'pii', 'share'];

Router.register('#/document', async (parts) => {
  const id = parts[0];
  const tab = parts[1] || 'overview';
  const { document: doc } = await Api.get(`/api/documents/${id}`);
  State.currentDoc = doc;

  document.getElementById('app').innerHTML = `
    <div class="flex-between">
      <div>
        <h2 class="section-heading">${esc(doc.original_name)}</h2>
        <p class="section-sub">${fmtBytes(doc.size)} · SHA-256 ${doc.sha256.slice(0, 16)}… · OCR confidence ${Math.round((doc.ocr_confidence || 0) * 100)}%</p>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="verifyIntegrity('${doc.id}')">🔍 Verify Integrity</button>
    </div>
    <div class="topnav glass" style="padding:8px; border-radius:12px; margin-bottom:20px; display:inline-flex">
      ${DOC_TABS.map(t => `<button class="${t === tab ? 'active' : ''}" onclick="Router.go('#/document/${id}/${t}')">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
    </div>
    <div id="docTabContent"></div>
  `;

  const content = document.getElementById('docTabContent');
  content.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';

  switch (tab) {
    case 'overview': await renderOverviewTab(doc, content); break;
    case 'chat': await renderChatTab(doc, content); break;
    case 'negotiation': await renderNegotiationTab(doc, content); break;
    case 'risk': await renderRiskTab(doc, content); break;
    case 'compliance': await renderComplianceTab(doc, content); break;
    case 'deadlines': await renderDeadlinesTab(doc, content); break;
    case 'pii': await renderPiiTab(doc, content); break;
    case 'share': await renderShareTab(doc, content); break;
  }
});

async function verifyIntegrity(id) {
  try {
    const r = await Api.get(`/api/documents/${id}/verify`);
    toast(r.valid ? '✓ File integrity verified — SHA-256 match' : '✗ Integrity check failed!', r.valid ? 'ok' : 'error');
  } catch (e) { toast(e.message, 'error'); }
}

function highlightText(text, excerpts) {
  let html = esc(text);
  for (const ex of excerpts) {
    const escaped = esc(ex.text);
    html = html.split(escaped).join(`<mark>${escaped}</mark>`);
  }
  return html;
}

async function renderOverviewTab(doc, content) {
  const { clauses } = await Api.get(`/api/ai/documents/${doc.id}/clauses`);
  const allExcerpts = Object.values(clauses).flatMap(c => c.excerpts);

  content.innerHTML = `
    <div class="split">
      <div class="glass card">
        <div class="card-title"><span class="dot"></span>Document Text</div>
        <div class="doc-text">${highlightText(doc.extracted_text || '(no extractable text)', allExcerpts)}</div>
        <button class="btn btn-ghost btn-sm mt-16" onclick="showSimplified('${doc.id}')">🗣️ Plain-Language Translation</button>
        <div id="simplifiedArea" class="mt-16"></div>
      </div>
      <div class="glass card">
        <div class="card-title"><span class="dot"></span>Extracted Clauses</div>
        ${Object.entries(clauses).map(([key, c]) => `
          <div class="clause-item ${c.found ? '' : 'not-found'}">
            <h4>${c.label}${c.found ? '' : ' — not found'}</h4>
            ${c.excerpts.map(e => `<p>${esc(e.text)}</p>`).join('') || '<p class="text-lo">No matching clause detected.</p>'}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function showSimplified(id) {
  const area = document.getElementById('simplifiedArea');
  area.innerHTML = '<div class="spinner"></div>';
  const { simplified } = await Api.get(`/api/ai/documents/${id}/simplify`);
  area.innerHTML = `<div class="glass card" style="background:rgba(0,255,178,0.04)"><div class="card-title"><span class="dot" style="background:var(--mint)"></span>Plain English</div><div class="doc-text">${esc(simplified)}</div></div>`;
}

async function renderChatTab(doc, content) {
  const { messages } = await Api.get(`/api/ai/documents/${doc.id}/chat`);
  content.innerHTML = `
    <div class="glass card">
      <div class="card-title"><span class="dot"></span>AI Document Chatbot (RAG)</div>
      <div class="chat-window" id="chatWindow">
        ${messages.length === 0 ? '<p class="text-lo">Ask a question about this document — e.g. "When does this contract terminate?"</p>' :
          messages.map(chatMsgHtml).join('')}
      </div>
      <div class="chat-input-row">
        <input id="chatInput" placeholder="Ask about parties, payment, termination, jurisdiction…" />
        <button class="btn btn-primary" id="chatSendBtn">Send</button>
      </div>
    </div>
  `;
  const send = async () => {
    const input = document.getElementById('chatInput');
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    const win = document.getElementById('chatWindow');
    win.innerHTML += `<div class="chat-msg user">${esc(q)}</div>`;
    win.scrollTop = win.scrollHeight;
    try {
      const r = await Api.post(`/api/ai/documents/${doc.id}/chat`, { question: q });
      win.innerHTML += `<div class="chat-msg assistant">${esc(r.answer)}
        <div class="mt-8">
          <span class="badge ${r.confidence > 0.6 ? 'badge-ok' : 'badge-warn'}">Confidence ${Math.round(r.confidence * 100)}%</span>
          ${r.sources.map(s => `<span class="source-tag">${s.pageRef}</span>`).join('')}
        </div></div>`;
      win.scrollTop = win.scrollHeight;
    } catch (e) { toast(e.message, 'error'); }
  };
  document.getElementById('chatSendBtn').onclick = send;
  document.getElementById('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
}

function chatMsgHtml(m) {
  if (m.role === 'user') return `<div class="chat-msg user">${esc(m.content)}</div>`;
  let sources = [];
  try { sources = JSON.parse(m.source_ref || '[]'); } catch (e) {}
  return `<div class="chat-msg assistant">${esc(m.content)}
    <div class="mt-8">
      ${m.confidence != null ? `<span class="badge ${m.confidence > 0.6 ? 'badge-ok' : 'badge-warn'}">Confidence ${Math.round(m.confidence * 100)}%</span>` : ''}
      ${sources.map(s => `<span class="source-tag">${s.pageRef}</span>`).join('')}
    </div></div>`;
}

async function renderNegotiationTab(doc, content) {
  const { suggestions } = await Api.get(`/api/ai/documents/${doc.id}/negotiation`);
  content.innerHTML = `
    <div class="glass card">
      <div class="card-title"><span class="dot"></span>Negotiation Assistant</div>
      ${suggestions.length === 0 ? emptyState('✅', 'No high-risk clauses flagged', 'This document looks balanced based on our heuristic scan.') :
        suggestions.map(s => `
          <div class="neg-card glass risk-${s.risk}">
            <div class="flex-between">
              <strong>${esc(s.issue)}</strong>
              <span class="badge ${s.risk === 'high' ? 'badge-danger' : 'badge-warn'}">${s.risk.toUpperCase()} RISK</span>
            </div>
            <blockquote>"${esc(s.clause)}"</blockquote>
            <p class="text-mid small">${esc(s.recommendation)}</p>
            <div class="neg-suggested">💡 Suggested replacement: ${esc(s.suggestedText)}</div>
          </div>
        `).join('')}
    </div>
  `;
}

async function renderRiskTab(doc, content) {
  const r = await Api.get(`/api/ai/documents/${doc.id}/risk`);
  const labels = { termination: 'Termination', liability: 'Liability', confidentiality: 'Confidentiality', payment: 'Payment', compliance: 'Compliance' };
  content.innerHTML = `
    <div class="grid grid-2">
      <div class="glass card" style="text-align:center">
        <div class="card-title" style="justify-content:center"><span class="dot"></span>Overall Risk Score</div>
        <div class="metric-value" style="font-size:56px; color:${r.overall > 50 ? 'var(--danger)' : r.overall > 25 ? 'var(--warn)' : 'var(--ok)'}">${r.overall}</div>
        <p class="text-lo">out of 100</p>
      </div>
      <div class="glass card">
        <div class="card-title"><span class="dot"></span>Risk Breakdown</div>
        ${Object.entries(r.breakdown).map(([k, v]) => `
          <div class="risk-bar-row">
            <div class="label">${labels[k] || k}</div>
            <div class="risk-bar-track"><div class="risk-bar-fill" style="width:${v}%; background:${v > 50 ? 'var(--danger)' : v > 25 ? 'var(--warn)' : 'var(--ok)'}"></div></div>
            <div class="val">${v}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function renderComplianceTab(doc, content) {
  const { frameworks } = await Api.get(`/api/ai/documents/${doc.id}/compliance`);
  content.innerHTML = `
    <div class="glass card">
      <div class="card-title"><span class="dot"></span>Compliance Checker</div>
      ${Object.values(frameworks).map(fw => `
        <div class="compliance-row">
          <div class="flex-between"><strong>${esc(fw.label)}</strong><span class="badge ${fw.score >= 70 ? 'badge-ok' : fw.score >= 40 ? 'badge-warn' : 'badge-danger'}">${fw.score}%</span></div>
          ${fw.checks.map(c => `<div class="compliance-check"><span class="${c.pass ? 'icon-pass' : 'icon-fail'}">${c.pass ? '✓' : '✗'}</span> ${esc(c.name)}</div>`).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

async function renderDeadlinesTab(doc, content) {
  const { deadlines } = await Api.get(`/api/ai/documents/${doc.id}/deadlines`);
  content.innerHTML = `
    <div class="glass card">
      <div class="card-title"><span class="dot"></span>Deadlines Found in This Document</div>
      ${deadlines.length === 0 ? emptyState('📅', 'No dates detected', 'No renewal, expiry, or payment dates found in this document.') :
        deadlines.map(d => `
          <div class="deadline-item">
            <div class="deadline-date">${esc(d.date)}</div>
            <div><span class="badge badge-info">${d.category.replace('_', ' ')}</span><p class="text-mid small mt-8">${esc(d.context)}</p></div>
          </div>
        `).join('')}
    </div>
  `;
}

async function renderPiiTab(doc, content) {
  const { items } = await Api.get(`/api/ai/documents/${doc.id}/pii`);
  content.innerHTML = `
    <div class="glass card">
      <div class="card-title"><span class="dot"></span>AI Privacy Mode — PII Detection</div>
      ${items.length === 0 ? emptyState('🛡️', 'No PII detected', 'No Aadhaar, PAN, passport, phone, email or card numbers found.') : `
        ${items.map(i => `<div class="pii-item"><span>${esc(i.label)}</span><span class="mono">${esc(i.value)}</span></div>`).join('')}
        <button class="btn btn-primary mt-16" onclick="doRedact('${doc.id}')">🔒 Redact All PII</button>
      `}
      <div id="redactResult" class="mt-16"></div>
    </div>
  `;
}

async function doRedact(id) {
  try {
    const r = await Api.post(`/api/ai/documents/${id}/redact`, {});
    document.getElementById('redactResult').innerHTML = `
      <div class="glass card"><div class="card-title"><span class="dot" style="background:var(--mint)"></span>Redacted Output (${r.itemsFound} items masked)</div>
      <div class="doc-text">${esc(r.redacted)}</div></div>`;
    toast(`${r.itemsFound} PII items redacted`, 'ok');
  } catch (e) { toast(e.message, 'error'); }
}

async function renderShareTab(doc, content) {
  content.innerHTML = `
    <div class="glass card">
      <div class="card-title"><span class="dot"></span>Secure Link Sharing</div>
      <form id="shareForm">
        <div class="grid grid-3">
          <div><label>Password (optional)</label><input name="password" type="text" placeholder="Leave blank for none" /></div>
          <div><label>Expires in (hours)</label><input name="expiresInHours" type="number" placeholder="e.g. 48" /></div>
          <div><label>Max downloads</label><input name="maxDownloads" type="number" placeholder="e.g. 3" /></div>
        </div>
        <button class="btn btn-primary mt-16" type="submit">🔗 Generate Secure Link</button>
      </form>
      <div id="shareResult" class="mt-16"></div>
    </div>
  `;
  document.getElementById('shareForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    try {
      const r = await Api.post('/api/share', { documentId: doc.id, ...fd });
      const fullUrl = `${window.location.origin}${r.url}`;
      document.getElementById('shareResult').innerHTML = `
        <div class="glass card" style="background:rgba(0,255,178,0.04)">
          <p class="mono small">${fullUrl}</p>
          <p class="text-mid small">${r.passwordProtected ? '🔒 Password protected · ' : ''}${r.expiresAt ? 'Expires ' + fmtDate(r.expiresAt) : 'No expiry'} · ${r.maxDownloads ? r.maxDownloads + ' downloads max' : 'Unlimited downloads'}</p>
        </div>`;
      toast('Secure share link created', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  };
}

// =============================================================================
// VIEW: Contract Generator
// =============================================================================
Router.register('#/contracts', async () => {
  const { types } = await Api.get('/api/contracts/types');
  document.getElementById('app').innerHTML = `
    <h2 class="section-heading">AI Contract Generator</h2>
    <p class="section-sub">Choose a contract type, fill in the details, and generate a signed, ready-to-use document.</p>
    <div class="glass card">
      <label>Contract type</label>
      <select id="ctypeSelect">${types.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}</select>
      <div id="ctypeFields" class="mt-16"></div>
      <button class="btn btn-primary mt-16" id="genBtn">✨ Generate Contract</button>
    </div>
    <div id="contractPreviewWrap" class="mt-24"></div>
  `;

  function renderFields() {
    const type = types.find(t => t.id === document.getElementById('ctypeSelect').value);
    document.getElementById('ctypeFields').innerHTML = `<div class="grid grid-2">${type.fields.map(f => `
      <div><label>${f.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}</label><input name="${f}" /></div>
    `).join('')}</div>`;
  }
  document.getElementById('ctypeSelect').onchange = renderFields;
  renderFields();

  document.getElementById('genBtn').onclick = async () => {
    const type = document.getElementById('ctypeSelect').value;
    const inputs = document.querySelectorAll('#ctypeFields input');
    const params = {};
    inputs.forEach(i => { if (i.value) params[i.name] = i.value; });
    try {
      const r = await Api.post('/api/contracts/generate', { type, params });
      document.getElementById('contractPreviewWrap').innerHTML = `
        <div class="glass card">
          <div class="flex-between">
            <div class="card-title"><span class="dot"></span>Generated Contract — Digitally Signed</div>
            <button class="btn btn-ghost btn-sm" onclick="downloadContract('${r.id}')">⬇ Download .txt</button>
          </div>
          <div class="contract-preview">${esc(r.content)}</div>
          <p class="text-lo small mt-16 mono">RSA-SHA256 signature: ${r.signature.slice(0, 48)}…</p>
        </div>`;
      toast('Contract generated and signed', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  };
});

async function downloadContract(id) {
  const { contract } = await Api.get(`/api/contracts/${id}`);
  const blob = new Blob([contract.content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${contract.contract_type}_${id.slice(0, 8)}.txt`;
  a.click();
}

// =============================================================================
// VIEW: Deadlines calendar (global)
// =============================================================================
Router.register('#/deadlines', async () => {
  const { deadlines } = await Api.get('/api/ai/deadlines');
  const grouped = { renewal: [], expiry: [], payment_due: [], notice_period: [], general: [] };
  deadlines.forEach(d => (grouped[d.category] || grouped.general).push(d));

  document.getElementById('app').innerHTML = `
    <h2 class="section-heading">Deadline Calendar</h2>
    <p class="section-sub">Automatically extracted renewal, expiry, payment, and notice dates across all your documents.</p>
    ${deadlines.length === 0 ? `<div class="glass card">${emptyState('📅', 'No deadlines found', 'Upload documents with dates to populate this calendar.')}</div>` : `
    <div class="grid grid-2">
      ${Object.entries(grouped).filter(([, v]) => v.length).map(([cat, items]) => `
        <div class="glass card">
          <div class="card-title"><span class="dot"></span>${cat.replace('_', ' ').toUpperCase()}</div>
          ${items.map(d => `
            <div class="deadline-item">
              <div class="deadline-date">${esc(d.date)}</div>
              <div>
                <a href="#/document/${d.documentId}/deadlines" class="small">${esc(d.documentName)}</a>
                <p class="text-mid small mt-8">${esc(d.context)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>`}
  `;
});

// =============================================================================
// VIEW: Security Center
// =============================================================================
Router.register('#/security', async () => {
  const [dash, sessions, audit, threats, zt] = await Promise.all([
    Api.get('/api/security/dashboard'),
    Api.get('/api/security/sessions'),
    Api.get('/api/security/audit?limit=40'),
    Api.get('/api/security/threats'),
    Api.get('/api/security/zero-trust')
  ]);

  document.getElementById('app').innerHTML = `
    <h2 class="section-heading">Security Operations Center</h2>
    <p class="section-sub">Encryption monitor, zero-trust status, session manager, MFA, and the immutable blockchain audit ledger.</p>

    <div class="grid grid-3">
      <div class="glass card">
        <div class="card-title"><span class="dot"></span>Zero-Trust Status</div>
        <div class="metric-value" style="color:${zt.score >= 70 ? 'var(--ok)' : zt.score >= 40 ? 'var(--warn)' : 'var(--danger)'}">${zt.score}</div>
        <p class="text-lo small">${zt.reasons.length ? zt.reasons.join(' · ') : 'All checks passed'}</p>
      </div>
      <div class="glass card">
        <div class="card-title"><span class="dot"></span>MFA Status</div>
        <p><span class="badge ${zt.mfaEnabled ? 'badge-ok' : 'badge-warn'}">${zt.mfaEnabled ? 'TOTP Enabled ✓' : 'Not Enabled'}</span></p>
        ${zt.mfaEnabled ? '' : `<button class="btn btn-primary btn-sm mt-8" onclick="Router.go('#/security/mfa-setup')">Enable MFA</button>`}
      </div>
      <div class="glass card">
        <div class="card-title"><span class="dot"></span>Encryption Monitor</div>
        <p><span class="badge badge-ok">AES-256-GCM Active</span></p>
        <p class="text-lo small mt-8">All documents encrypted at rest. Integrity verified via SHA-256.</p>
      </div>
    </div>

    <div class="glass card mt-24">
      <div class="card-title"><span class="dot"></span>Active Sessions Manager</div>
      ${sessions.sessions.map(s => `
        <div class="session-row">
          <div>
            <strong>${s.id === sessions.currentSessionId ? '📍 This device' : 'Session'}</strong> ${s.mfa_verified ? '<span class="badge badge-ok">MFA</span>' : ''}
            <p class="text-lo small">IP hash ${s.ip} · trust ${s.trust_score} · last seen ${fmtDate(s.last_seen)}</p>
          </div>
          ${s.revoked ? '<span class="badge badge-danger">Revoked</span>' : s.id === sessions.currentSessionId ? '' : `<button class="btn btn-sm btn-ghost" onclick="revokeSession('${s.id}')">Revoke</button>`}
        </div>
      `).join('')}
    </div>

    <div class="grid grid-2 mt-24">
      <div class="glass card">
        <div class="card-title"><span class="dot"></span>Threat Alerts</div>
        ${threats.threats.length === 0 ? emptyState('✅', 'No threats detected', '') :
          threats.threats.map(t => `<div class="session-row"><div><span class="badge ${t.severity === 'high' ? 'badge-danger' : 'badge-warn'}">${t.severity}</span> ${esc(t.message)}<p class="text-lo small mt-8">${fmtDate(t.created_at)}</p></div></div>`).join('')}
      </div>
      <div class="glass card">
        <div class="card-title"><span class="dot"></span>Digital Signature Verification</div>
        <p class="text-mid small">Public signing key (RSA-2048):</p>
        <textarea readonly rows="4" class="mono small">${dash ? '' : ''}</textarea>
        <button class="btn btn-ghost btn-sm mt-8" id="loadKeyBtn">Load Public Key</button>
      </div>
    </div>

    <div class="glass card mt-24">
      <div class="flex-between">
        <div class="card-title"><span class="dot"></span>Immutable Blockchain Audit Ledger</div>
        <span class="badge ${audit.blocks.length ? 'badge-ok' : 'badge-warn'}">Chain: ${dash.auditLedger.valid ? 'VERIFIED ✓' : 'BROKEN ✗'}</span>
      </div>
      <button class="btn btn-ghost btn-sm mt-8" onclick="verifyChain()">🔍 Re-verify Chain Integrity</button>
      <div id="chainVerifyResult"></div>
      <div class="mt-16">${audit.blocks.map(auditBlockHtml).join('')}</div>
    </div>
  `;

  document.getElementById('loadKeyBtn').onclick = async () => {
    const { publicKey } = await Api.get('/api/security/signing-key');
    document.querySelector('.mono.small').value = publicKey;
  };
});

async function revokeSession(id) {
  try {
    await Api.post(`/api/security/sessions/${id}/revoke`);
    toast('Session revoked', 'ok');
    Router.resolve();
  } catch (e) { toast(e.message, 'error'); }
}

async function verifyChain() {
  const r = await Api.get('/api/security/audit/verify');
  document.getElementById('chainVerifyResult').innerHTML = `
    <p class="mt-8 ${r.valid ? '' : 'text-danger'}"><span class="badge ${r.valid ? 'badge-ok' : 'badge-danger'}">${r.valid ? 'Chain integrity confirmed' : 'TAMPERING DETECTED'}</span> — ${r.totalBlocks} blocks checked${r.problems.length ? ': ' + JSON.stringify(r.problems) : ''}</p>
  `;
}

Router.register('#/security/mfa-setup', async () => {
  const { secret, qrDataUrl } = await Api.post('/api/auth/mfa/totp/setup');
  document.getElementById('app').innerHTML = `
    <h2 class="section-heading">Enable Two-Factor Authentication</h2>
    <div class="glass card auth-wrap" style="text-align:center">
      <img src="${qrDataUrl}" alt="TOTP QR code" style="width:200px; border-radius:12px; margin:12px auto; display:block" />
      <p class="text-mid small">Or enter manually: <span class="mono">${secret}</span></p>
      <form id="enableForm" class="mt-16">
        <label>Enter the 6-digit code from your authenticator app</label>
        <input name="code" maxlength="6" required />
        <button class="btn btn-primary btn-block mt-16" type="submit">Enable MFA</button>
      </form>
    </div>
  `;
  document.getElementById('enableForm').onsubmit = async (e) => {
    e.preventDefault();
    const code = new FormData(e.target).get('code');
    try {
      await Api.post('/api/auth/mfa/totp/enable', { code });
      toast('MFA enabled successfully', 'ok');
      Router.go('#/security');
    } catch (err) { toast(err.message, 'error'); }
  };
});

Router.register('#/notfound', async () => {
  document.getElementById('app').innerHTML = `<div class="empty-state"><div class="icon">🔍</div><h3>Page not found</h3><button class="btn btn-primary mt-16" onclick="Router.go('#/')">Go Home</button></div>`;
});

// =============================================================================
// Bootstrap
// =============================================================================
(async function init() {
  await refreshMe();
  Router.resolve();
})();
