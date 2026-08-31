import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import PageTransition from '../components/common/PageTransition';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { fmtBytes } from '../utils/formatters';
import { buttonMotion, EASE_OUT, DURATIONS } from '../styles/motion';

import OverviewTab from '../components/document/OverviewTab';
import ChatTab from '../components/document/ChatTab';
import NegotiationTab from '../components/document/NegotiationTab';
import RiskTab from '../components/document/RiskTab';
import ComplianceTab from '../components/document/ComplianceTab';
import DeadlinesTab from '../components/document/DeadlinesTab';
import PiiTab from '../components/document/PiiTab';
import ShareTab from '../components/document/ShareTab';

const DOC_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'chat', label: 'AI Chat' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'risk', label: 'Risk' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'pii', label: 'PII / Redact' },
  { id: 'share', label: 'Share' }
];

export const DocumentDetail = () => {
  const { id, tab } = useParams();
  const activeTab = tab || 'overview';
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    async function loadDoc() {
      try {
        const res = await Api.get(`/api/documents/${id}`);
        if (isMounted) setDoc(res.document);
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to load document', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDoc();
    return () => {
      isMounted = false;
    };
  }, [id, toast]);

  const verifyIntegrity = async () => {
    setVerifying(true);
    try {
      const r = await Api.get(`/api/documents/${id}/verify`);
      toast(
        r.valid ? '✓ File integrity verified — SHA-256 match' : '✗ Integrity check failed!',
        r.valid ? 'ok' : 'error'
      );
    } catch (e) {
      toast(e.message || 'Integrity check failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <SkeletonLoader.Text lines={2} width="400px" />
        <div style={{ marginTop: '20px' }}>
          <SkeletonLoader.Card count={1} height="400px" />
        </div>
      </PageTransition>
    );
  }

  if (!doc) {
    return (
      <div className="empty-state">
        <h3>Document not found</h3>
        <button className="btn btn-primary mt-16" onClick={() => navigate('/documents')}>
          Back to Documents
        </button>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex-between mb-16">
        <div className="truncate" style={{ maxWidth: '65%' }}>
          <h1 className="page-title truncate">{doc.original_name}</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            {fmtBytes(doc.size)} · SHA-256 {doc.sha256 ? doc.sha256.slice(0, 16) : ''}… · OCR{' '}
            {Math.round((doc.ocr_confidence || 0) * 100)}%
          </p>
        </div>
        <motion.button
          className="btn btn-outline btn-sm"
          onClick={verifyIntegrity}
          disabled={verifying}
          {...buttonMotion}
        >
          <Icon.eye /> {verifying ? 'Verifying…' : 'Verify Integrity'}
        </motion.button>
      </div>

      {/* Tabs Header with Subtle Active Line */}
      <div className="tab-bar">
        {DOC_TABS.map((t) => {
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              className={`tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => navigate(`/document/${id}/${t.id}`)}
              style={{ position: 'relative' }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeDocTabIndicator"
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: 'var(--royal)'
                  }}
                  transition={{ duration: DURATIONS.fast, ease: EASE_OUT }}
                />
              )}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Fast, subtle tab switching */}
      <div id="docTabContent" className="mt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
          >
            {activeTab === 'overview' && <OverviewTab doc={doc} />}
            {activeTab === 'chat' && <ChatTab doc={doc} />}
            {activeTab === 'negotiation' && <NegotiationTab doc={doc} />}
            {activeTab === 'risk' && <RiskTab doc={doc} />}
            {activeTab === 'compliance' && <ComplianceTab doc={doc} />}
            {activeTab === 'deadlines' && <DeadlinesTab doc={doc} />}
            {activeTab === 'pii' && <PiiTab doc={doc} />}
            {activeTab === 'share' && <ShareTab doc={doc} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default DocumentDetail;
