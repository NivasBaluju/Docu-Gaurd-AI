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
import { buttonMotion, EASE_OUT } from '../styles/motion';

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
      toast('Public key loaded', 'ok');
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
          <h1 className="page-title">Security Center</h1>
          <p className="page-sub">
            Encryption monitor, zero-trust status, sessions, MFA, and the immutable audit ledger.
          </p>
        </div>
        <span
          className={`badge ${dash.auditLedger?.valid ? 'badge-ok' : 'badge-danger'}`}
          style={{ fontSize: '13px' }}
        >
          {dash.auditLedger?.valid ? (
            <>
              <Icon.check /> Chain Verified
            </>
          ) : (
            <>
              <Icon.alert /> Chain Broken
            </>
          )}
        </span>
      </div>

      {/* Status Row */}
      <div className="grid grid-3">
        <div className="card">
          <div className="card-title">
            <span className="dot" />
            Zero-Trust Score
          </div>
          <div className="metric-row">
            <div className={`metric-icon-wrap ${ztTone}`}>
              <Icon.shield />
            </div>
            <div>
              <div className="metric-value">{ztScore}</div>
              <div className="metric-label">out of 100</div>
            </div>
          </div>
          <p className="text-lo small mt-12">
            {zt.reasons?.length ? zt.reasons.join(' · ') : 'All security checks passed'}
          </p>
        </div>

        <div className="card">
          <div className="card-title">
            <span className="dot dot-gold" />
            MFA Status
          </div>
          <div className="metric-row">
            <div className={`metric-icon-wrap ${zt.mfaEnabled ? 'metric-icon-green' : 'metric-icon-amber'}`}>
              <Icon.lock />
            </div>
            <div>
              <span className={`badge ${zt.mfaEnabled ? 'badge-ok' : 'badge-warn'}`}>
                {zt.mfaEnabled ? (
                  <>
                    <Icon.check /> TOTP Enabled
                  </>
                ) : (
                  'Not Enabled'
                )}
              </span>
              {!zt.mfaEnabled && (
                <div className="mt-8">
                  <motion.button
                    className="btn btn-royal btn-sm"
                    onClick={() => navigate('/security/mfa-setup')}
                    {...buttonMotion}
                  >
                    Enable MFA
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span className="dot dot-emerald" />
            Encryption Monitor
          </div>
          <div className="metric-row">
            <div className="metric-icon-wrap metric-icon-green">
              <Icon.lock />
            </div>
            <div>
              <span className="badge badge-ok">
                <Icon.check /> AES-256-GCM Active
              </span>
              <p className="text-lo small mt-8">
                All documents encrypted at rest. Integrity via SHA-256.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="card mt-24">
        <div className="card-title">
          <span className="dot" />
          Active Sessions Manager
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <AnimatePresence>
            {sessions.sessions?.map((s) => (
              <motion.div
                key={s.id}
                className="session-row"
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                style={{ margin: 0 }}
              >
                <div>
                  <strong>
                    {s.id === sessions.currentSessionId ? '📍 This device' : 'Remote session'}
                  </strong>
                  {s.mfa_verified && (
                    <span className="badge badge-ok" style={{ marginLeft: '8px' }}>
                      MFA
                    </span>
                  )}
                  <p className="text-lo small">
                    IP hash {s.ip} · Trust {s.trust_score} · Last seen {fmtDate(s.last_seen)}
                  </p>
                </div>
                {s.revoked ? (
                  <span className="badge badge-danger">Revoked</span>
                ) : s.id === sessions.currentSessionId ? (
                  <span className="badge badge-ok">Current</span>
                ) : (
                  <motion.button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleRevokeSession(s.id)}
                    {...buttonMotion}
                  >
                    Revoke
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Threats + Sig */}
      <div className="grid grid-2 mt-24">
        <div className="card">
          <div className="card-title">
            <span className="dot" />
            Threat Alerts
          </div>
          {threats?.threats?.length === 0 ? (
            <EmptyState
              icon={<Icon.shield />}
              title="No threats detected"
              sub="Your account has no active security alerts."
            />
          ) : (
            threats?.threats?.map((t) => (
              <div key={t.id} className="session-row">
                <div>
                  <span className={`badge ${t.severity === 'high' ? 'badge-danger' : 'badge-warn'}`}>
                    {t.severity}
                  </span>
                  <span style={{ marginLeft: '8px' }}>{t.message}</span>
                  <p className="text-lo small mt-8">{fmtDate(t.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <span className="dot dot-gold" />
            Digital Signature Verification
          </div>
          <p className="text-mid small mb-8">Public signing key (RSA-2048):</p>
          <textarea
            readOnly
            rows={5}
            className="mono small"
            style={{ resize: 'none', background: 'var(--off-white)' }}
            value={publicKey}
            placeholder="Click below to load public key..."
          />
          <motion.button
            className="btn btn-outline btn-sm mt-8"
            onClick={handleLoadKey}
            {...buttonMotion}
          >
            <Icon.eye /> Load Public Key
          </motion.button>
        </div>
      </div>

      {/* Audit Ledger */}
      <div className="card mt-24">
        <div className="flex-between mb-12">
          <div className="card-title" style={{ marginBottom: 0 }}>
            <span className="dot dot-emerald" />
            Immutable Blockchain Audit Ledger
          </div>
          <motion.button
            className="btn btn-outline btn-sm"
            onClick={handleVerifyChain}
            disabled={verifyingChain}
            {...buttonMotion}
          >
            <Icon.eye /> {verifyingChain ? 'Verifying…' : 'Re-verify Chain'}
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
            >
              <p className="mt-8">
                <span className={`badge ${chainVerifyResult.valid ? 'badge-ok' : 'badge-danger'}`}>
                  {chainVerifyResult.valid ? (
                    <>
                      <Icon.check /> Chain integrity confirmed
                    </>
                  ) : (
                    <>
                      <Icon.alert /> TAMPERING DETECTED
                    </>
                  )}
                </span>{' '}
                — {chainVerifyResult.totalBlocks} blocks checked
                {chainVerifyResult.problems?.length
                  ? ': ' + JSON.stringify(chainVerifyResult.problems)
                  : ''}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-16">
          {audit?.blocks?.map((block) => (
            <AuditBlock key={block.id || block.block_index} block={block} />
          ))}
        </div>
      </div>
    </PageTransition>
  );
};

export default Security;
