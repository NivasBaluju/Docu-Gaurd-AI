import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import Api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/common/Icon';
import MetricCard from '../components/common/MetricCard';
import SkeletonLoader from '../components/common/SkeletonLoader';
import PageTransition from '../components/common/PageTransition';
import { useToast } from '../context/ToastContext';
import { buttonMotion, staggerContainer } from '../styles/motion';

export const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchDashboard() {
      try {
        const [dashRes, docsRes] = await Promise.all([
          Api.get('/api/security/dashboard'),
          Api.get('/api/documents')
        ]);
        if (isMounted) {
          setData(dashRes);
          setDocuments(docsRes.documents || []);
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

      {/* Row 3: Recent Protected Documents + Quick Actions */}
      <div className="grid grid-2 mt-24">
        <div className="card">
          <div className="flex-between mb-16">
            <div className="card-title" style={{ margin: 0 }}>
              <span className="dot dot-emerald" />
              Recent Protected Documents
            </div>
            <span className="text-lo small">{documents.length} Total</span>
          </div>

          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#71717A' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
              <p style={{ fontSize: '13px', margin: '0 0 12px' }}>No documents uploaded yet.</p>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/upload')}
              >
                Upload First Document
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <Icon.document />
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#F4F4F5', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {doc.original_name}
                      </div>
                      <div className="mono" style={{ fontSize: '10.5px', color: '#71717A' }}>
                        SHA-256 · {doc.sha256 ? `${doc.sha256.slice(0, 10)}…` : 'VERIFIED'}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${doc.risk_score > 50 ? 'badge-danger' : doc.risk_score > 25 ? 'badge-warn' : 'badge-ok'}`} style={{ fontSize: '10.5px' }}>
                    Risk {doc.risk_score ?? 0}%
                  </span>
                </div>
              ))}

              {documents.length > 4 && (
                <motion.button
                  className="btn btn-ghost btn-sm mt-8"
                  onClick={() => navigate('/documents')}
                  {...buttonMotion}
                >
                  View All {documents.length} Documents →
                </motion.button>
              )}
            </div>
          )}
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
              <Icon.shield /> Security Observatory
            </motion.button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
