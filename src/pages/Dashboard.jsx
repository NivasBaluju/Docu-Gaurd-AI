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
import { buttonMotion, staggerContainer } from '../styles/motion';

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
        <SkeletonLoader.Card count={4} height="100px" />
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
      <div className="flex-between mb-24">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">
            Welcome back, {firstName}. Here's your security &amp; activity overview.
          </p>
        </div>
        <motion.button
          className="btn btn-primary"
          onClick={() => navigate('/upload')}
          {...buttonMotion}
        >
          <Icon.upload /> Upload Document
        </motion.button>
      </div>

      {/* Row 1: 4 metric cards */}
      <motion.div className="grid grid-4" variants={staggerContainer}>
        <MetricCard
          icon={<Icon.document />}
          iconCls="metric-icon-blue"
          value={data.documentsUploaded}
          label="Documents Uploaded"
        />
        <MetricCard
          icon={<Icon.alert />}
          iconCls={avgRiskTone}
          value={data.avgRiskScore}
          label="Avg. Risk Score"
          badgeCls={avgRiskBadge}
        />
        <MetricCard
          icon={<Icon.shield />}
          iconCls={trustTone}
          value={data.trustScore}
          label="Zero-Trust Score"
          badgeCls={trustBadge}
        />
        <MetricCard
          icon={<Icon.alert />}
          iconCls={threatTone}
          value={data.threatAlerts}
          label="Threat Alerts"
          badgeCls={threatBadge}
        />
      </motion.div>

      {/* Row 2: 4 more metrics */}
      <motion.div className="grid grid-4 mt-16" variants={staggerContainer}>
        <MetricCard
          icon={<Icon.chat />}
          iconCls="metric-icon-blue"
          value={data.chatInteractions}
          label="AI Chat Sessions"
        />
        <MetricCard
          icon={<Icon.pen />}
          iconCls="metric-icon-gold"
          value={data.contractsGenerated}
          label="Contracts Generated"
        />
        <MetricCard
          icon={<Icon.lock />}
          iconCls="metric-icon-navy"
          value={data.activeSessions}
          label="Active Sessions"
        />
        <MetricCard
          icon={<Icon.check />}
          iconCls="metric-icon-green"
          value={data.complianceGauge}
          label="Compliance Score"
          badgeCls="badge-ok"
        />
      </motion.div>

      {/* Row 3: Audit Ledger + Quick Actions */}
      <div className="grid grid-2 mt-24">
        <div className="card">
          <div className="card-title">
            <span className="dot dot-emerald" />
            Immutable Audit Ledger
          </div>
          <div className="flex-between mb-16">
            <span className="text-lo small">{data.auditLedger?.totalBlocks || 0} blocks</span>
            <span className={`badge ${data.auditLedger?.valid ? 'badge-ok' : 'badge-danger'}`}>
              {data.auditLedger?.valid ? (
                <>
                  <Icon.check /> Chain Verified
                </>
              ) : (
                <>
                  <Icon.alert /> Tampered
                </>
              )}
            </span>
          </div>

          {audit?.blocks?.slice(0, 4).map((block) => (
            <AuditBlock key={block.id || block.block_index} block={block} />
          ))}

          <motion.button
            className="btn btn-ghost btn-sm mt-16"
            onClick={() => navigate('/security')}
            {...buttonMotion}
          >
            <Icon.shield /> View Full Ledger
          </motion.button>
        </div>

        <div className="card">
          <div className="card-title">
            <span className="dot dot-gold" />
            Quick Actions
          </div>
          <div className="grid" style={{ gap: '10px' }}>
            <motion.button
              className="btn btn-primary"
              onClick={() => navigate('/upload')}
              {...buttonMotion}
            >
              <Icon.upload /> Upload &amp; Analyze Document
            </motion.button>
            <motion.button
              className="btn btn-outline"
              onClick={() => navigate('/contracts')}
              {...buttonMotion}
            >
              <Icon.pen /> Generate a Contract
            </motion.button>
            <motion.button
              className="btn btn-outline"
              onClick={() => navigate('/deadlines')}
              {...buttonMotion}
            >
              <Icon.calendar /> View Deadlines
            </motion.button>
            <motion.button
              className="btn btn-outline"
              onClick={() => navigate('/security')}
              {...buttonMotion}
            >
              <Icon.shield /> Security Center
            </motion.button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
