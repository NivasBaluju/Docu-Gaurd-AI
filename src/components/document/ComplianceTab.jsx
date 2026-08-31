import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import SkeletonLoader from '../common/SkeletonLoader';

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
    return <SkeletonLoader.Card count={3} height="130px" />;
  }

  return (
    <div className="card">
      <div className="card-title">
        <span className="dot dot-emerald" />
        Regulatory &amp; Legal Compliance Checker
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {frameworks &&
          Object.values(frameworks).map((fw, idx) => {
            const score = fw.score || 0;
            const scoreBadge = score >= 70 ? 'badge-ok' : score >= 40 ? 'badge-warn' : 'badge-danger';

            return (
              <div key={idx} className="compliance-row" style={{ margin: 0 }}>
                <div className="flex-between mb-8">
                  <strong style={{ color: 'var(--navy)', fontSize: '14px' }}>{fw.label}</strong>
                  <span className={`badge ${scoreBadge}`}>{score}% Compliant</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {fw.checks?.map((c, cIdx) => (
                    <div key={cIdx} className="compliance-check">
                      <span
                        className={c.pass ? 'icon-pass' : 'icon-fail'}
                        style={{ width: '16px', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
                      >
                        {c.pass ? <Icon.check /> : '✗'}
                      </span>
                      <span style={{ color: c.pass ? 'var(--navy)' : 'var(--red)', fontSize: '13px' }}>
                        {c.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ComplianceTab;
