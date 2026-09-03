import React from 'react';
import { motion } from 'motion/react';
import Icon from '../common/Icon';
import MetricCard from '../common/MetricCard';
import { staggerContainer } from '../../styles/motion';

export const PortfolioSummaryCards = ({ summary = {} }) => {
  const {
    totalContracts = 0,
    activeContracts = 0,
    totalActions = 0,
    activeActions = 0,
    criticalActions = 0,
    overdueActions = 0,
    escalatedActions = 0,
    portfolioHealthScore = 100,
    portfolioHealthGrade = 'EXCELLENT',
    operationalHealth = {}
  } = summary;

  const getHealthGradeStyle = (grade) => {
    switch (grade) {
      case 'EXCELLENT':
        return { color: '#10B981', badgeCls: 'badge-ok' };
      case 'GOOD':
        return { color: '#3B82F6', badgeCls: 'badge-ok' };
      case 'ATTENTION':
        return { color: '#F59E0B', badgeCls: 'badge-warn' };
      case 'AT_RISK':
        return { color: '#F97316', badgeCls: 'badge-warn' };
      case 'CRITICAL':
      default:
        return { color: '#EF4444', badgeCls: 'badge-danger' };
    }
  };

  const healthStyle = getHealthGradeStyle(portfolioHealthGrade);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Portfolio Health Header Banner */}
      <div
        className="card"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(30,27,75,0.6), rgba(15,23,42,0.85))',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <div className="flex-between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="flex gap-8" style={{ alignItems: 'center', marginBottom: '6px' }}>
              <span className="dot dot-cyan" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#FFF' }}>
                Contract Portfolio Governance
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#A1A1AA',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}
              >
                v{operationalHealth.formulaVersion || '1.0'}
              </span>
            </div>
            <p className="text-muted small" style={{ margin: 0, maxWidth: '680px' }}>
              Executive oversight score weighting individual contract health, active risk velocity, and portfolio queue discipline.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '38px', fontWeight: 800, color: healthStyle.color, lineHeight: 1 }}>
                {portfolioHealthScore} <span style={{ fontSize: '18px', color: '#71717A' }}>/ 100</span>
              </div>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: '4px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: healthStyle.color
                }}
              >
                ● {portfolioHealthGrade}
              </span>
            </div>
          </div>
        </div>

        {/* Penalty details breakdown */}
        {operationalHealth.penalties && (
          <div
            style={{
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap',
              fontSize: '12px'
            }}
          >
            <div>
              <span className="text-muted">Weighted Base Score: </span>
              <strong style={{ color: '#FFF' }}>{operationalHealth.weightedBase || 100}</strong>
            </div>
            {operationalHealth.penalties.escalationPenalty < 0 && (
              <div>
                <span className="text-muted">Escalation Penalty: </span>
                <strong style={{ color: '#EF4444' }}>{operationalHealth.penalties.escalationPenalty} pts</strong>
              </div>
            )}
            {operationalHealth.penalties.criticalOverduePenalty < 0 && (
              <div>
                <span className="text-muted">Critical Overdue Penalty: </span>
                <strong style={{ color: '#EF4444' }}>{operationalHealth.penalties.criticalOverduePenalty} pts</strong>
              </div>
            )}
            <div>
              <span className="text-muted">Active Contracts: </span>
              <strong style={{ color: '#60A5FA' }}>{activeContracts} of {totalContracts}</strong>
            </div>
          </div>
        )}
      </div>

      {/* 6 Key Performance Metric Cards */}
      <motion.div className="grid grid-3 gap-16" variants={staggerContainer} initial="hidden" animate="show">
        <MetricCard
          icon={<Icon.document />}
          iconCls="metric-icon-blue"
          value={totalContracts}
          label="Total Contracts"
          hint={`${activeContracts} contracts with active actions`}
        />
        <MetricCard
          icon={<Icon.check />}
          iconCls="metric-icon-cyan"
          value={activeActions}
          label="Active Workflow Actions"
          hint={`${totalActions} total lifetime actions`}
        />
        <MetricCard
          icon={<Icon.alert />}
          iconCls={criticalActions > 0 ? 'metric-icon-red' : 'metric-icon-green'}
          value={criticalActions}
          label="Critical Priority Actions"
          badgeCls={criticalActions > 0 ? 'badge-danger' : 'badge-ok'}
          badgeText={criticalActions > 0 ? 'NEEDS REVIEW' : 'NONE'}
        />
        <MetricCard
          icon={<Icon.calendar />}
          iconCls={overdueActions > 0 ? 'metric-icon-amber' : 'metric-icon-blue'}
          value={overdueActions}
          label="Overdue Actions"
          badgeCls={overdueActions > 0 ? 'badge-warn' : 'badge-ok'}
          badgeText={overdueActions > 0 ? `${overdueActions} Overdue` : 'ON TRACK'}
        />
        <MetricCard
          icon={<Icon.shield />}
          iconCls={escalatedActions > 0 ? 'metric-icon-red' : 'metric-icon-navy'}
          value={escalatedActions}
          label="Escalated Actions"
          badgeCls={escalatedActions > 0 ? 'badge-danger' : 'badge-ok'}
          badgeText={escalatedActions > 0 ? 'ESCALATED' : 'STABLE'}
        />
        <MetricCard
          icon={<Icon.shield />}
          iconCls="metric-icon-gold"
          value={`${portfolioHealthScore}%`}
          label="Portfolio Governance Index"
          badgeCls={healthStyle.badgeCls}
          badgeText={portfolioHealthGrade}
        />
      </motion.div>
    </div>
  );
};

export default PortfolioSummaryCards;
