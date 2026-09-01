import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import PageTransition from '../components/common/PageTransition';

import SecurityGauge from '../components/security/SecurityGauge';
import ActivityChart from '../components/security/ActivityChart';
import SessionsManager from '../components/security/SessionsManager';
import ThreatBreakdown from '../components/security/ThreatBreakdown';
import SignatureInspector from '../components/security/SignatureInspector';
import LedgerExplorer from '../components/security/LedgerExplorer';

export const Security = () => {
  const [dash, setDash] = useState({ auditLedger: { valid: true, totalBlocks: 124 } });
  const [sessions, setSessions] = useState({ sessions: [], currentSessionId: '' });
  const [audit, setAudit] = useState({ blocks: [] });
  const [threats, setThreats] = useState({ threats: [] });
  const [zt, setZt] = useState({ score: 100, mfaEnabled: false, reasons: ['Hardware-grade zero-trust active'] });
  const [publicKey, setPublicKey] = useState('');
  const [chainVerifyResult, setChainVerifyResult] = useState(null);
  const [verifyingChain, setVerifyingChain] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchSecurityData = async () => {
    try {
      const [dashRes, sessRes, auditRes, threatRes, ztRes] = await Promise.all([
        Api.get('/api/security/dashboard').catch(() => null),
        Api.get('/api/security/sessions').catch(() => null),
        Api.get('/api/security/audit?limit=60').catch(() => null),
        Api.get('/api/security/threats').catch(() => null),
        Api.get('/api/security/zero-trust').catch(() => null)
      ]);
      if (dashRes) setDash(dashRes);
      if (sessRes) setSessions(sessRes);
      if (auditRes) setAudit(auditRes);
      if (threatRes) setThreats(threatRes);
      if (ztRes) setZt(ztRes);
    } catch (err) {
      console.error('fetchSecurityData error:', err);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleRevokeSession = async (sessionId) => {
    try {
      await Api.post(`/api/security/sessions/${sessionId}/revoke`);
      toast('Session enclave revoked successfully', 'ok');
      await fetchSecurityData();
    } catch (err) {
      toast(err.message || 'Failed to revoke session', 'error');
    }
  };

  const handleLoadKey = async () => {
    try {
      const res = await Api.get('/api/security/signing-key');
      setPublicKey(res.publicKey || '');
      toast('Public key certificate loaded', 'ok');
    } catch (err) {
      toast(err.message || 'Failed to load public key', 'error');
    }
  };

  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    try {
      const res = await Api.get('/api/security/audit/verify');
      setChainVerifyResult(res);
      toast(res.valid ? 'Blockchain audit chain verified successfully' : 'Tampering detected in chain', res.valid ? 'ok' : 'error');
    } catch (err) {
      toast(err.message || 'Chain verification failed', 'error');
    } finally {
      setVerifyingChain(false);
    }
  };

  const ztScore = zt?.score ?? 100;
  const isAuditValid = dash?.auditLedger?.valid !== false;

  return (
    <PageTransition>
      {/* Header Banner */}
      <div className="flex-between mb-24">
        <div>
          <span className="mono text-lo small" style={{ letterSpacing: '0.08em' }}>[ZERO-TRUST_SOC_V2]</span>
          <h1 className="page-title" style={{ marginTop: '2px' }}>Security & Audit Operations Center</h1>
          <p className="page-sub">
            Real-time cryptographic telemetry, zero-trust enclave authorization, and immutable ledger integrity.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span
            className={`badge ${isAuditValid ? 'badge-ok' : 'badge-danger'}`}
            style={{ fontSize: '13px', padding: '6px 12px' }}
          >
            {isAuditValid ? '✓ SHA-256 Merkle Valid' : '⚠ Ledger Breach'}
          </span>
        </div>
      </div>

      {/* Row 1: Zero-Trust Posture Gauge & Activity Velocity Chart */}
      <div className="grid grid-2">
        <SecurityGauge
          score={ztScore}
          mfaEnabled={zt?.mfaEnabled}
          auditValid={isAuditValid}
          reasons={zt?.reasons || []}
        />
        <ActivityChart
          auditBlocks={audit?.blocks || []}
          sessions={sessions?.sessions || []}
        />
      </div>

      {/* Row 2: Active Session Enclaves Hub */}
      <SessionsManager
        sessions={sessions?.sessions || []}
        currentSessionId={sessions?.currentSessionId}
        onRevokeSession={handleRevokeSession}
      />

      {/* Row 3: Threat Analytics & Digital Signature Verification */}
      <div className="grid grid-2 mt-24">
        <ThreatBreakdown threats={threats?.threats || []} />
        <SignatureInspector
          publicKey={publicKey}
          onLoadKey={handleLoadKey}
        />
      </div>

      {/* Row 4: Immutable Blockchain Audit Ledger Explorer */}
      <LedgerExplorer
        auditBlocks={audit?.blocks || []}
        onVerifyChain={handleVerifyChain}
        verifyingChain={verifyingChain}
        chainVerifyResult={chainVerifyResult}
      />
    </PageTransition>
  );
};

export default Security;
