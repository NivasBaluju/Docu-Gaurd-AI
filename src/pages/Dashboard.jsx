import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import Api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/common/Icon';
import MetricCard from '../components/common/MetricCard';
import AuditBlock from '../components/common/AuditBlock';
import SkeletonLoader from '../components/common/SkeletonLoader';
import PageTransition from '../components/common/PageTransition';
import { useToast } from '../context/ToastContext';
import { buttonMotion, staggerContainer, cardHoverMotion } from '../styles/motion';

export const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchDashboard() {
      try {
        const [dashRes, auditRes] = await Promise.all([
          Api.get('/api/security/dashboard'),
          Api.get('/api/security/audit?limit=5')
        ]);
        if (isMounted) {
          setData(dashRes);
          setAudit(auditRes);
        }
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to load dashboard', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  if (loading || !data) {
    return (
      <PageTransition>
        <div className="flex-between mb-24">
          <SkeletonLoader.Text lines={2} width="280px" />
        </div>
        <SkeletonLoader.Card count={1} height="200px" />
        <div style={{ marginTop: '20px' }}>
          <SkeletonLoader.Card count={4} height="90px" />
        </div>
        <div style={{ marginTop: '24px' }}>
          <SkeletonLoader.Card count={2} height="240px" />
        </div>
      </PageTransition>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Counsellor';
  const avgRiskTone = data.avgRiskScore > 50 ? 'metric-icon-red' : data.avgRiskScore > 25 ? 'metric-icon-amber' : 'metric-icon-green';
  const avgRiskBadge = data.avgRiskScore > 50 ? 'badge-danger' : data.avgRiskScore > 25 ? 'badge-warn' : 'badge-ok';
  const trustTone = data.trustScore >= 70 ? 'metric-icon-green' : data.trustScore >= 40 ? 'metric-icon-amber' : 'metric-icon-red';
  const trustBadge = data.trustScore >= 70 ? 'badge-ok' : data.trustScore >= 40 ? 'badge-warn' : 'badge-danger';
  const threatTone = data.threatAlerts > 0 ? 'metric-icon-amber' : 'metric-icon-green';
  const threatBadge = data.threatAlerts > 0 ? 'badge-warn' : 'badge-ok';

  return (
    <PageTransition>
      {/* Header Bar */}
      <div className="flex-between mb-24">
        <div>
          <span className="eyebrow-bullet">Intelligence Chamber Overview</span>
          <h1 className="page-title" style={{ marginTop: '4px' }}>Executive Dashboard</h1>
          <p className="page-sub">
            Welcome back, {firstName}. Here is your live legal intelligence &amp; security posture.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <motion.button
            className="btn btn-outline"
            onClick={() => navigate('/documents')}
            {...buttonMotion}
          >
            <Icon.document /> All Documents
          </motion.button>
          <motion.button
            className="btn btn-primary"
            onClick={() => navigate('/upload')}
            {...buttonMotion}
          >
            <Icon.upload /> Upload Document
          </motion.button>
        </div>
      </div>

      {/* DOMINANT INTELLIGENCE SPOTLIGHT */}
      <motion.div className="intelligence-spotlight mb-24" {...cardHoverMotion}>
        <div className="split" style={{ alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className="badge badge-gold"><Icon.shield /> Institutional Status</span>
              <span className="badge badge-ok"><Icon.check /> Chain Active</span>
            </div>
            <h2 style={{ fontSize: '28px', color: '#FFFFFF', marginBottom: '10px' }}>
              {data.documentsUploaded} Protected Documents
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '14.5px', lineHeight: '1.6', maxWidth: '520px', marginBottom: '20px' }}>
              All documents currently verified against tamper heuristics. Average firm risk exposure is currently <strong style={{ color: '#FFFFFF' }}>{data.avgRiskScore}/100 ({data.avgRiskScore > 50 ? 'High' : data.avgRiskScore > 25 ? 'Moderate' : 'Low'})</strong>.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <motion.button
                className="btn btn-gold btn-sm"
                onClick={() => navigate('/upload')}
                {...buttonMotion}
              >
                <Icon.upload /> Secure Upload
              </motion.button>
              <motion.button
                className="btn btn-outline btn-sm"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.2)' }}
                onClick={() => navigate('/security')}
                {...buttonMotion}
              >
                <Icon.shield /> Zero-Trust Center
              </motion.button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius)',
              padding: '20px'
            }}
          >
            <div>
              <div className="text-lo small" style={{ color: '#94A3B8', marginBottom: '4px' }}>Zero-Trust Score</div>
              <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)', color: '#34D399' }}>
                {data.trustScore}%
              </div>
              <div className="small" style={{ color: '#94A3B8' }}>SOC 2 Evaluated</div>
            </div>
            <div>
              <div className="text-lo small" style={{ color: '#94A3B8', marginBottom: '4px' }}>Compliance Score</div>
              <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)', color: '#60A5FA' }}>
                {data.complianceGauge}%
              </div>
              <div className="small" style={{ color: '#94A3B8' }}>GDPR / IT Act</div>
            </div>
            <div>
              <div className="text-lo small" style={{ color: '#94A3B8', marginBottom: '4px' }}>Active Sessions</div>
              <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)', color: '#F1F5F9' }}>
                {data.activeSessions}
              </div>
              <div className="small" style={{ color: '#94A3B8' }}>MFA Protected</div>
            </div>
            <div>
              <div className="text-lo small" style={{ color: '#94A3B8', marginBottom: '4px' }}>Threat Alerts</div>
              <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)', color: data.threatAlerts > 0 ? '#F87171' : '#34D399' }}>
                {data.threatAlerts}
              </div>
              <div className="small" style={{ color: '#94A3B8' }}>Real-time Sentinel</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* SECONDARY METRICS GRID */}
      <motion.div className="grid grid-4" variants={staggerContainer}>
        <MetricCard
          icon={<Icon.document />}
          iconCls="metric-icon-blue"
          value={data.documentsUploaded}
          label="Total Files"
        />
        <MetricCard
          icon={<Icon.alert />}
          iconCls={avgRiskTone}
          value={data.avgRiskScore}
          label="Avg. Risk Index"
          badgeCls={avgRiskBadge}
        />
        <MetricCard
          icon={<Icon.chat />}
          iconCls="metric-icon-blue"
          value={data.chatInteractions}
          label="AI Chat Inquiries"
        />
        <MetricCard
          icon={<Icon.pen />}
          iconCls="metric-icon-gold"
          value={data.contractsGenerated}
          label="Generated Contracts"
        />
      </motion.div>

      {/* WORKSPACE SECTIONS: AUDIT LEDGER & QUICK ACTIONS */}
      <div className="grid grid-2 mt-24">
        <motion.div className="card" {...cardHoverMotion}>
          <div className="flex-between mb-16">
            <div className="card-title" style={{ margin: 0 }}>
              <span className="dot dot-emerald" />
              Immutable Audit Ledger
            </div>
            <span className={`badge ${data.auditLedger?.valid ? 'badge-ok' : 'badge-danger'}`}>
              {data.auditLedger?.valid ? (
                <>
                  <Icon.check /> Chain Verified ({data.auditLedger?.totalBlocks || 0})
                </>
              ) : (
                <>
                  <Icon.alert /> Tampered
                </>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {audit?.blocks?.slice(0, 4).map((block) => (
              <AuditBlock key={block.id || block.block_index} block={block} />
            ))}
          </div>

          <motion.button
            className="btn btn-ghost btn-sm mt-16"
            onClick={() => navigate('/security')}
            {...buttonMotion}
          >
            <Icon.shield /> Open Security Center →
          </motion.button>
        </motion.div>

        <motion.div className="card" {...cardHoverMotion}>
          <div className="card-title">
            <span className="dot dot-gold" />
            Command &amp; Workflow Launcher
          </div>
          <div className="grid" style={{ gap: '10px' }}>
            <motion.button
              className="btn btn-primary"
              onClick={() => navigate('/upload')}
              {...buttonMotion}
            >
              <Icon.upload /> Ingest &amp; Dissect Document
            </motion.button>
            <motion.button
              className="btn btn-outline"
              onClick={() => navigate('/contracts')}
              {...buttonMotion}
            >
              <Icon.pen /> Author &amp; Sign Contract
            </motion.button>
            <motion.button
              className="btn btn-outline"
              onClick={() => navigate('/deadlines')}
              {...buttonMotion}
            >
              <Icon.calendar /> Review Contract Milestones &amp; Expirations
            </motion.button>
            <motion.button
              className="btn btn-outline"
              onClick={() => navigate('/security')}
              {...buttonMotion}
            >
              <Icon.shield /> Institutional Trust &amp; Hardware MFA
            </motion.button>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
