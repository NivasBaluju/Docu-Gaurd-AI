import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import SkeletonLoader from '../common/SkeletonLoader';

export const DeadlinesTab = ({ doc }) => {
  const [deadlines, setDeadlines] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    async function loadDeadlines() {
      try {
        const res = await Api.get(`/api/ai/documents/${doc.id}/deadlines`);
        if (isMounted) setDeadlines(res.deadlines || []);
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to extract deadlines', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDeadlines();
    return () => {
      isMounted = false;
    };
  }, [doc.id, toast]);

  if (loading) {
    return <SkeletonLoader.Card count={2} height="120px" />;
  }

  return (
    <div className="card">
      <div className="card-title">
        <span className="dot dot-gold" />
        Extracted Deadlines &amp; Milestones
      </div>

      {deadlines && deadlines.length === 0 ? (
        <EmptyState
          icon={<Icon.calendar />}
          title="No critical dates detected"
          sub="No specific renewal, termination, or payment deadlines were detected in this document."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
          {deadlines?.map((d, idx) => (
            <div key={idx} className="deadline-item" style={{ margin: 0 }}>
              <div className="deadline-date">{d.date}</div>
              <div>
                <span className="badge badge-info">
                  {d.category ? d.category.replace('_', ' ') : 'General'}
                </span>
                <p className="text-mid small mt-8">{d.context}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeadlinesTab;
