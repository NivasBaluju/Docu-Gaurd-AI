import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';
import AuditBlock from '../components/common/AuditBlock';
import SkeletonLoader from '../components/common/SkeletonLoader';
import PageTransition from '../components/common/PageTransition';
import { fmtDate } from '../utils/formatters';
import { buttonMotion, EASE_OUT, cardHoverMotion } from '../styles/motion';

export const Security = () => {
  const [dash, setDash] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [audit, setAudit] = useState(null);
  const [threats, setThreats] = useState(null);
  const [zt, setZt] = useState(null);
  const [publicKey, setPublicKey] = useState('');
  const [chainVerifyResult, setChainVerifyResult] = useState(null);
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchSecurityData = async () => {
    try {
      const [dashRes, sessRes, auditRes, threatRes, ztRes] = await Promise.all([
        Api.get('/api/security/dashboard'),
        Api.get('/api/security/sessions'),
        Api.get('/api/security/audit?limit=40'),
        Api.get('/api/security/threats'),
        Api.get('/api/security/zero-trust')
      ]);
      setDash(dashRes);
      setSessions(sessRes);
      setAudit(auditRes);
      setThreats(threatRes);
      setZt(ztRes);
    } catch (err) {
      toast(err.message || 'Failed to load security center', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleRevokeSession = async (sessionId) => {
    try {
      await Api.post(`/api/security/sessions/${sessionId}/revoke`);
      toast('Session revoked successfully', 'ok');
      await fetchSecurityData();
    } catch (err) {
      toast(err.message || 'Failed to revoke session', 'error');
    }
  };

  const handleLoadKey = async () => {
    try {
      const res = await Api.get('/api/security/signing-key');
      setPublicKey(res.publicKey || '');
      toast('Public key loaded from cryptographic vault', 'ok');
    } catch (err) {
      toast(err.message || 'Failed to load public key', 'error');
    }
  };

  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    try {
      const res = await Api.get('/api/security/audit/verify');
      setChainVerifyResult(res);
      toast(res.valid ? 'Blockchain audit chain verified' : 'Tampering detected in chain', res.valid ? 'ok' : 'error');
    } catch (err) {
      toast(err.message || 'Chain verification failed', 'error');
    } finally {
      setVerifyingChain(false);
    }
  };

  if (loading || !dash || !zt || !sessions) {
    return (
      <PageTransition>
        <div className="flex-between mb-24">
          <SkeletonLoader.Text lines={2} width="320px" />
        </div>
        <SkeletonLoader.Card count={3} height="120px" />
        <div style={{ marginTop: '24px' }}>
          <SkeletonLoader.Card count={2} height="200px" />
        </div>
      </PageTransition>
    );
  }

  const ztScore = zt.score ?? 100;
  const ztTone = ztScore >= 70 ? 'metric-icon-green' : ztScore >= 40 ? 'metric-icon-amber' : 'metric-icon-red';

  return (
    <PageTransition>
      <div className="flex-between mb-24">
        <div>
          <span className="eyebrow-bullet">Institutional Trust &amp; SOC-2 Sentinel</span>
          <h1 className="page-title" style={{ marginTop: '4px' }}>Security Center</h1>
          <p className="page-sub" style={{ maxWidth: '640px' }}>
            Real-time zero-trust posture, active session revocation, cryptographic signing keys, and immutable blockchain ledger verification.
          </p>
        </div>
        <span
          className={`badge ${dash.auditLedger?.valid ? 'badge-ok' : 'badge-danger'}`}
          style={{ fontSize: '13px', padding: '6px 12px' }}
        >
          {dash.auditLedger?.valid ? (
            <>
              <Icon.check /> Chain Verified ({dash.auditLedger?.totalBlocks || 0} Blocks)
            </>
          ) : (
            <>
              <Icon.alert /> Chain Broken
            </>
          )}
        </span>
      </div>

      {/* Security Status Row */}
      <div className="grid grid-3">
        <motion.div className="card" {...cardHoverMotion}>
          <div className="card-title">
            <span className="dot dot-emerald" />
            Zero-Trust Score
          </div>
          <div className="metric-row">
            <div className={`metric-icon-wrap ${ztTone}`}>
              <Icon.shield />
            </div>
            <div>
              <div className="metric-value">{ztScore}%</div>
              <div className="metric-label">Institutional Assurance</div>
            </div>
          </div>
          <p className="small text-muted mt-12" style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '8px' }}>
            {zt.reasons?.length ? zt.reasons.join(' · ') : 'All continuous behavioral telemetry checks verified.'}
          </p>
        </motion.div>

        <motion.div className="card" {...cardHoverMotion}>
          <div className="card-title">
            <span className="dot dot-gold" />
            MFA Authentication
          </div>
          <div className="metric-row">
            <div className={`metric-icon-wrap ${zt.mfaEnabled ? 'metric-icon-green' : 'metric-icon-amber'}`}>
              <Icon.lock />
            </div>
            <div>
              <span className={`badge ${zt.mfaEnabled ? 'badge-ok' : 'badge-warn'}`}>
                {zt.mfaEnabled ? (
                  <>
                    <Icon.check /> Hardware / TOTP Active
                  </>
                ) : (
                  'Email OTP Fallback'
                )}
              </span>
              {!zt.mfaEnabled && (
                <div className="mt-8">
                  <motion.button
                    className="btn btn-gold btn-sm"
                    onClick={() => navigate('/security/mfa-setup')}
                    {...buttonMotion}
                  >
                    Setup Authenticator App
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div className="card" {...cardHoverMotion}>
          <div className="card-title">
            <span className="dot dot-emerald" />
            Envelope Encryption
          </div>
          <div className="metric-row">
            <div className="metric-icon-wrap metric-icon-green">
              <Icon.lock />
            </div>
            <div>
              <span className="badge badge-ok">
                <Icon.check /> AES-256-GCM Active
              </span>
              <p className="small text-muted mt-8">
                All documents encrypted symmetrically at rest. SHA-256 integrity.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Active Sessions Manager */}
      <motion.div className="card mt-24" {...cardHoverMotion}>
        <div className="flex-between mb-16">
          <div className="card-title" style={{ margin: 0 }}>
            <span className="dot dot-emerald" />
            Active Sessions &amp; Device Sentinel
          </div>
          <span className="badge badge-neutral">{sessions.sessions?.length || 0} Sessions</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <AnimatePresence>
            {sessions.sessions?.map((s) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'var(--canvas-bg)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <div>
                  <strong style={{ color: 'var(--ink-primary)', fontSize: '14px' }}>
                    {s.id === sessions.currentSessionId ? '📍 Current Active Device' : 'Remote Connected Device'}
                  </strong>
                  {s.mfa_verified && (
                    <span className="badge badge-ok" style={{ marginLeft: '8px', fontSize: '11px' }}>
                      MFA Verified
                    </span>
                  )}
                  <p className="mono text-muted small" style={{ marginTop: '2px' }}>
                    IP: {s.ip} · Trust Rating: {s.trust_score}% · Last Seen: {fmtDate(s.last_seen)}
                  </p>
                </div>
                {s.revoked ? (
                  <span className="badge badge-danger">Revoked</span>
                ) : s.id === sessions.currentSessionId ? (
                  <span className="badge badge-ok">Active Now</span>
                ) : (
                  <motion.button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleRevokeSession(s.id)}
                    {...buttonMotion}
                  >
                    Revoke Access
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Threats + Public Key */}
      <div className="grid grid-2 mt-24">
        <motion.div className="card" {...cardHoverMotion}>
          <div className="card-title">
            <span className="dot dot-amber" />
            Threat Alerts &amp; Heuristics
          </div>
          {threats?.threats?.length === 0 ? (
            <EmptyState
              icon={<Icon.shield />}
              title="No threats detected"
              sub="Zero anomalies, brute-force attempts, or suspicious geographic logins detected."
            />
          ) : (
            threats?.threats?.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: '12px 16px',
                  background: 'var(--canvas-bg)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className={`badge ${t.severity === 'high' ? 'badge-danger' : 'badge-warn'}`}>
                    {t.severity}
                  </span>
                  <span style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--ink-primary)' }}>{t.message}</span>
                </div>
                <p className="text-muted small">{fmtDate(t.created_at)}</p>
              </div>
            ))
          )}
        </motion.div>

        <motion.div className="card" {...cardHoverMotion}>
          <div className="card-title">
            <span className="dot dot-gold" />
            Cryptographic Signing Vault
          </div>
          <p className="text-muted small mb-8">Firm Public Signing Key (RSA-2048):</p>
          <textarea
            readOnly
            rows={5}
            className="mono small"
            style={{
              resize: 'none',
              background: 'var(--canvas-bg)',
              border: '1px solid var(--border-hairline)',
              fontSize: '11px',
              padding: '12px'
            }}
            value={publicKey}
            placeholder="Click below to extract public key from cryptographic keystore..."
          />
          <motion.button
            className="btn btn-outline btn-sm mt-12"
            onClick={handleLoadKey}
            {...buttonMotion}
          >
            <Icon.eye /> Retrieve Public Signing Key
          </motion.button>
        </motion.div>
      </div>

      {/* Immutable Audit Ledger */}
      <motion.div className="card mt-24" {...cardHoverMotion}>
        <div className="flex-between mb-16">
          <div>
            <div className="card-title" style={{ marginBottom: 0 }}>
              <span className="dot dot-emerald" />
              Immutable Blockchain Audit Ledger
            </div>
            <p className="text-muted small mt-4">
              Cryptographically chained SHA-256 blocks recording every document lifecycle event.
            </p>
          </div>
          <motion.button
            className="btn btn-primary btn-sm"
            onClick={handleVerifyChain}
            disabled={verifyingChain}
            {...buttonMotion}
          >
            <Icon.eye /> {verifyingChain ? 'Verifying Hashes…' : 'Re-verify Entire Ledger'}
          </motion.button>
        </div>

        <AnimatePresence>
          {chainVerifyResult && (
            <motion.div
              id="chainVerifyResult"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ marginBottom: '16px' }}
            >
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: chainVerifyResult.valid ? 'var(--emerald-bg)' : 'var(--crimson-bg)',
                  border: `1px solid ${chainVerifyResult.valid ? 'var(--emerald-border)' : 'var(--crimson-border)'}`
                }}
              >
                <span className={`badge ${chainVerifyResult.valid ? 'badge-ok' : 'badge-danger'}`}>
                  {chainVerifyResult.valid ? (
                    <>
                      <Icon.check /> Chain Integrity 100% Confirmed
                    </>
                  ) : (
                    <>
                      <Icon.alert /> TAMPERING DETECTED
                    </>
                  )}
                </span>{' '}
                — Verified {chainVerifyResult.totalBlocks} cryptographically linked blocks.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {audit?.blocks?.map((block) => (
            <AuditBlock key={block.id || block.block_index} block={block} />
          ))}
        </div>
      </motion.div>
    </PageTransition>
  );
};

export default Security;
