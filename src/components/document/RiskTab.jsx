import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const RiskTab = ({ doc }) => {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
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
        if (isMounted) setRiskData(res);
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
  }, [doc.id, toast]);

  if (loading) {
    return (
      <div className="spinner-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!riskData) return null;

  const overall = riskData.overall ?? 0;
  const riskColor = overall > 50 ? 'var(--red)' : overall > 25 ? 'var(--amber)' : 'var(--emerald)';
  const riskBadge = overall > 50 ? 'badge-danger' : overall > 25 ? 'badge-warn' : 'badge-ok';
  const riskLabel = overall > 50 ? 'High Risk' : overall > 25 ? 'Medium Risk' : 'Low Risk';

  return (
    <div className="grid grid-2">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="card-title" style={{ justifyContent: 'center' }}>
          <span className="dot" />
          Overall Risk Score
        </div>
        <div
          style={{
            fontFamily: 'var(--font-head)',
            fontSize: '72px',
            fontWeight: 700,
            color: riskColor,
            lineHeight: 1
          }}
        >
          {overall}
        </div>
        <p className="text-lo" style={{ margin: '4px 0 16px' }}>
          out of 100
        </p>
        <span className={`badge ${riskBadge}`} style={{ fontSize: '13px' }}>
          {riskLabel}
        </span>
      </div>

      <div className="card">
        <div className="card-title">
          <span className="dot" />
          Risk Breakdown
        </div>
        {riskData.breakdown &&
          Object.entries(riskData.breakdown).map(([k, v]) => {
            const val = Number(v) || 0;
            const c = val > 50 ? 'var(--red)' : val > 25 ? 'var(--amber)' : 'var(--emerald)';
            return (
              <div key={k} className="risk-bar-row">
                <div className="label">{labels[k] || k}</div>
                <div className="risk-bar-track">
                  <div className="risk-bar-fill" style={{ width: `${val}%`, background: c }} />
                </div>
                <div className="val" style={{ color: c }}>
                  {val}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default RiskTab;
