import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';

export const ComplianceTab = ({ doc }) => {
  const [frameworks, setFrameworks] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    async function loadCompliance() {
      try {
        const res = await Api.get(`/api/ai/documents/${doc.id}/compliance`);
        if (isMounted) setFrameworks(res.frameworks || {});
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to check compliance', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadCompliance();
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

  return (
    <div className="card">
      <div className="card-title">
        <span className="dot dot-emerald" />
        Compliance Checker
      </div>

      {frameworks &&
        Object.values(frameworks).map((fw, idx) => {
          const score = fw.score || 0;
          const scoreBadge = score >= 70 ? 'badge-ok' : score >= 40 ? 'badge-warn' : 'badge-danger';

          return (
            <div key={idx} className="compliance-row">
              <div className="flex-between mb-8">
                <strong>{fw.label}</strong>
                <span className={`badge ${scoreBadge}`}>{score}%</span>
              </div>
              {fw.checks?.map((c, cIdx) => (
                <div key={cIdx} className="compliance-check">
                  <span
                    className={c.pass ? 'icon-pass' : 'icon-fail'}
                    style={{ width: '16px', flexShrink: 0 }}
                  >
                    {c.pass ? <Icon.check /> : '✗'}
                  </span>
                  {c.name}
                </div>
              ))}
            </div>
          );
        })}
    </div>
  );
};

export default ComplianceTab;
