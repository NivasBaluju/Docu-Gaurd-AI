import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';

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
      <div className="spinner-center">
        <div className="spinner" />
      </div>
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
    <div>
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
                <span className="dot" />
                {cat.replace('_', ' ').toUpperCase()}
              </div>
              {items.map((d, idx) => (
                <div key={idx} className="deadline-item">
                  <div className="deadline-date">{d.date}</div>
                  <div>
                    <Link
                      to={`/document/${d.documentId}/deadlines`}
                      className="small bold text-royal"
                    >
                      {d.documentName}
                    </Link>
                    <p className="text-mid small mt-8">{d.context}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Deadlines;
