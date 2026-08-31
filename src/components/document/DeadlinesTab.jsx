import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';

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
    return (
      <div className="spinner-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        <span className="dot dot-gold" />
        Deadlines in This Document
      </div>

      {deadlines && deadlines.length === 0 ? (
        <EmptyState
          icon={<Icon.calendar />}
          title="No dates detected"
          sub="No renewal, expiry, or payment dates found in this document."
        />
      ) : (
        deadlines?.map((d, idx) => (
          <div key={idx} className="deadline-item">
            <div className="deadline-date">{d.date}</div>
            <div>
              <span className="badge badge-info">
                {d.category ? d.category.replace('_', ' ') : 'General'}
              </span>
              <p className="text-mid small mt-8">{d.context}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default DeadlinesTab;
