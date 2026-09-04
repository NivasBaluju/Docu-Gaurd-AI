import React, { useState, useEffect } from 'react';
import PortfolioSummaryCards from './PortfolioSummaryCards';
import PortfolioAttentionQueue from './PortfolioAttentionQueue';
import PortfolioHealthTable from './PortfolioHealthTable';
import PortfolioWorkload from './PortfolioWorkload';
import PortfolioRiskDistribution from './PortfolioRiskDistribution';
import PortfolioDeadlinesAndEscalations from './PortfolioDeadlinesAndEscalations';
import PortfolioCompliancePanel from '../compliance/PortfolioCompliancePanel';
import BulkOperationHistoryPanel from './BulkOperationHistoryPanel';
import PendingApprovalsQueue from './PendingApprovalsQueue';
import PortfolioMonitoring from './PortfolioMonitoring';
import SkeletonLoader from '../common/SkeletonLoader';
import { PortfolioAnalyticsApi } from '../../services/portfolioAnalyticsApi';
import { useToast } from '../../context/ToastContext';

export const PortfolioDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('MONITORING'); // Default to MONITORING in Phase 11 or OVERVIEW
  const { toast } = useToast();

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await PortfolioAnalyticsApi.getPortfolioSummary();
      setSummary(res);
    } catch (err) {
      toast(err.message || 'Failed to load portfolio summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
        <SkeletonLoader.Text lines={2} width="320px" />
        <div style={{ marginTop: '20px' }}>
          <SkeletonLoader.Card count={3} height="120px" />
        </div>
        <div style={{ marginTop: '24px' }}>
          <SkeletonLoader.Card count={2} height="260px" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* 1. Summary Cards Header */}
      <PortfolioSummaryCards summary={summary} />

      {/* 2. Navigation Mode Switcher */}
      <div
        className="card bg-paper-dim border border-rule"
        style={{
          padding: '6px 8px',
          display: 'flex',
          gap: '8px',
          borderRadius: '0px',
          width: 'fit-content',
          flexWrap: 'wrap',
        }}
      >
        <button
          className={`btn btn-sm ${activeTab === 'MONITORING' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('MONITORING')}
          style={{ fontSize: '12.5px', padding: '6px 14px' }}
        >
          📡 Continuous Monitoring
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'OVERVIEW' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('OVERVIEW')}
          style={{ fontSize: '12.5px', padding: '6px 14px' }}
        >
          📊 Portfolio Overview
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'ATTENTION' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('ATTENTION')}
          style={{ fontSize: '12.5px', padding: '6px 14px' }}
        >
          🚨 Executive Attention Queue
          {summary?.criticalActions + summary?.overdueActions + summary?.escalatedActions > 0 && (
            <span
              style={{
                marginLeft: '6px',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.3)',
                color: '#FFF'
              }}
            >
              {summary.criticalActions + summary.overdueActions + summary.escalatedActions}
            </span>
          )}
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'CONTRACTS' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('CONTRACTS')}
          style={{ fontSize: '12.5px', padding: '6px 14px' }}
        >
          📁 Contract Health Rankings
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'WORKLOAD' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('WORKLOAD')}
          style={{ fontSize: '12.5px', padding: '6px 14px' }}
        >
          👥 Team Workload &amp; Deadlines
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'AUDIT' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('AUDIT')}
          style={{ fontSize: '12.5px', padding: '6px 14px' }}
        >
          🛡️ Compliance &amp; Export
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'BULK_OPS' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('BULK_OPS')}
          style={{ fontSize: '12.5px', padding: '6px 14px' }}
        >
          ⚡ Bulk Operations
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'APPROVALS' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('APPROVALS')}
          style={{ fontSize: '12.5px', padding: '6px 14px' }}
        >
          🛡️ Governed Approvals
        </button>
      </div>

      {/* 3. Tab Contents */}
      {activeTab === 'MONITORING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <PortfolioMonitoring />
        </div>
      )}

      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Priority Attention Queue */}
          <PortfolioAttentionQueue />

          {/* Grid with Risk Distribution & Deadlines */}
          <div className="grid grid-2 gap-16">
            <PortfolioRiskDistribution />
            <PortfolioWorkload />
          </div>

          <PortfolioDeadlinesAndEscalations />
          <PortfolioHealthTable />
        </div>
      )}

      {activeTab === 'ATTENTION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <PortfolioAttentionQueue />
          <PortfolioDeadlinesAndEscalations />
        </div>
      )}

      {activeTab === 'CONTRACTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <PortfolioHealthTable />
          <PortfolioRiskDistribution />
        </div>
      )}

      {activeTab === 'WORKLOAD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <PortfolioWorkload />
          <PortfolioDeadlinesAndEscalations />
        </div>
      )}

      {activeTab === 'AUDIT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <PortfolioCompliancePanel />
        </div>
      )}

      {activeTab === 'BULK_OPS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Route to the Attention Queue where bulk ops are initiated */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>⚡</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>Bulk Operations</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
                  Select actions from the Attention Queue to run bulk assignment, deadline updates, or status transitions.
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setActiveTab('ATTENTION')}
              style={{ fontSize: '13px' }}
            >
              🚨 Go to Attention Queue →
            </button>
          </div>
          <BulkOperationHistoryPanel />
        </div>
      )}

      {activeTab === 'APPROVALS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <PendingApprovalsQueue onDecided={fetchSummary} />
        </div>
      )}
    </div>
  );
};

export default PortfolioDashboard;
