import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';
import SkeletonLoader from '../components/common/SkeletonLoader';
import PageTransition from '../components/common/PageTransition';

export const Deadlines = () => {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    async function loadDeadlines() {
      try {
        const res = await Api.get('/api/ai/deadlines');
        if (isMounted) setDeadlines(res.deadlines || []);
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to load deadlines', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDeadlines();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  if (loading) {
    return (
      <PageTransition>
        <SkeletonLoader.Text lines={2} width="300px" />
        <div style={{ marginTop: '20px' }}>
          <SkeletonLoader.Card count={2} height="200px" />
        </div>
      </PageTransition>
    );
  }

  const grouped = {
    renewal: [],
    expiry: [],
    payment_due: [],
    notice_period: [],
    general: []
  };

  deadlines.forEach((d) => {
    (grouped[d.category] || grouped.general).push(d);
  });

  const activeCategories = Object.entries(grouped).filter(([, v]) => v.length > 0);

  return (
    <PageTransition>
      <h1 className="page-title">Deadline Calendar</h1>
      <p className="page-sub">
        Automatically extracted renewal, expiry, payment, and notice dates across all your documents.
      </p>

      {deadlines.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Icon.calendar />}
            title="No deadlines found"
            sub="Upload documents with dates to populate this calendar."
          />
        </div>
      ) : (
        <div className="grid grid-2">
          {activeCategories.map(([cat, items]) => (
            <div key={cat} className="card">
              <div className="card-title">
                <span className="dot dot-gold" />
                {cat.replace('_', ' ').toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                {items.map((d, idx) => (
                  <div key={idx} className="deadline-item" style={{ margin: 0 }}>
                    <div className="deadline-date">{d.date}</div>
                    <div>
                      <Link
                        to={`/document/${d.documentId}/deadlines`}
                        className="small bold text-royal"
                        style={{ display: 'inline-block', marginBottom: '4px' }}
                      >
                        {d.documentName}
                      </Link>
                      <p className="text-mid small">{d.context}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageTransition>
  );
};

export default Deadlines;
