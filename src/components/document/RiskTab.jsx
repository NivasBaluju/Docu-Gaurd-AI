import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import SkeletonLoader from '../common/SkeletonLoader';
import { EASE_OUT } from '../../styles/motion';

export const RiskTab = ({ doc }) => {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);
  const hasAnimatedRef = useRef(false);
  const shouldReduceMotion = useReducedMotion();
  const { toast } = useToast();

  const labels = {
    termination: 'Termination',
    liability: 'Liability',
    confidentiality: 'Confidentiality',
    payment: 'Payment',
    compliance: 'Compliance'
  };

  useEffect(() => {
    let isMounted = true;
    async function loadRisk() {
      try {
        const res = await Api.get(`/api/ai/documents/${doc.id}/risk`);
        if (isMounted) {
          setRiskData(res);
          const finalScore = res.overall ?? 0;
          if (shouldReduceMotion || hasAnimatedRef.current) {
            setDisplayScore(finalScore);
          } else {
            hasAnimatedRef.current = true;
            const duration = 450;
            const startTime = performance.now();
            const animateGauge = (now) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const current = Math.round(finalScore * (1 - Math.pow(1 - progress, 3)));
              if (isMounted) setDisplayScore(current);
              if (progress < 1) requestAnimationFrame(animateGauge);
            };
            requestAnimationFrame(animateGauge);
          }
        }
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to calculate risk score', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadRisk();
    return () => {
      isMounted = false;
    };
  }, [doc.id, toast, shouldReduceMotion]);

  if (loading) {
    return <SkeletonLoader.Card count={2} height="260px" />;
  }

  if (!riskData) return null;

  const overall = riskData.overall ?? 0;
  const riskColor = overall > 50 ? 'var(--red)' : overall > 25 ? 'var(--amber)' : 'var(--emerald)';
  const riskBadge = overall > 50 ? 'badge-danger' : overall > 25 ? 'badge-warn' : 'badge-ok';
  const riskLabel = overall > 50 ? 'High Risk' : overall > 25 ? 'Medium Risk' : 'Low Risk';

  return (
    <div className="grid grid-2">
      <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px' }}>
        <div className="card-title" style={{ justifyContent: 'center' }}>
          <span className="dot" />
          Overall Risk Score
        </div>
        <div
          style={{
            fontFamily: 'var(--font-head)',
            fontSize: '76px',
            fontWeight: 700,
            color: riskColor,
            lineHeight: 1,
            margin: '8px 0'
          }}
        >
          {displayScore}
        </div>
        <p className="text-lo" style={{ margin: '0 0 16px' }}>
          out of 100
        </p>
        <span className={`badge ${riskBadge}`} style={{ fontSize: '13px' }}>
          {riskLabel}
        </span>
      </div>

      <div className="card">
        <div className="card-title">
          <span className="dot" />
          Risk Breakdown by Category
        </div>
        <div style={{ marginTop: '16px' }}>
          {riskData.breakdown &&
            Object.entries(riskData.breakdown).map(([k, v], idx) => {
              const val = Number(v) || 0;
              const c = val > 50 ? 'var(--red)' : val > 25 ? 'var(--amber)' : 'var(--emerald)';
              return (
                <div key={k} className="risk-bar-row">
                  <div className="label">{labels[k] || k}</div>
                  <div className="risk-bar-track">
                    <motion.div
                      className="risk-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${val}%` }}
                      transition={{ duration: 0.35, delay: idx * 0.05, ease: EASE_OUT }}
                      style={{ background: c }}
                    />
                  </div>
                  <div className="val" style={{ color: c }}>
                    {val}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default RiskTab;
