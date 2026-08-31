import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import { fmtBytes } from '../utils/formatters';

import OverviewTab from '../components/document/OverviewTab';
import ChatTab from '../components/document/ChatTab';
import NegotiationTab from '../components/document/NegotiationTab';
import RiskTab from '../components/document/RiskTab';
import ComplianceTab from '../components/document/ComplianceTab';
import DeadlinesTab from '../components/document/DeadlinesTab';
import PiiTab from '../components/document/PiiTab';
import ShareTab from '../components/document/ShareTab';

const DOC_TABS = ['overview', 'chat', 'negotiation', 'risk', 'compliance', 'deadlines', 'pii', 'share'];

export const DocumentDetail = () => {
  const { id, tab } = useParams();
  const activeTab = tab || 'overview';
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
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
    try {
      const r = await Api.get(`/api/documents/${id}/verify`);
      toast(
        r.valid ? '✓ File integrity verified — SHA-256 match' : '✗ Integrity check failed!',
        r.valid ? 'ok' : 'error'
      );
    } catch (e) {
      toast(e.message || 'Integrity check failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className="spinner-center">
        <div className="spinner" />
      </div>
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
    <div>
      <div className="flex-between mb-16">
        <div className="truncate" style={{ maxWidth: '60%' }}>
          <h1 className="page-title truncate">{doc.original_name}</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            {fmtBytes(doc.size)} · SHA-256 {doc.sha256 ? doc.sha256.slice(0, 16) : ''}… · OCR{' '}
            {Math.round((doc.ocr_confidence || 0) * 100)}%
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={verifyIntegrity}>
          <Icon.eye /> Verify Integrity
        </button>
      </div>

      <div className="tab-bar">
        {DOC_TABS.map((t) => (
          <button
            key={t}
            className={`tab-btn ${t === activeTab ? 'active' : ''}`}
            onClick={() => navigate(`/document/${id}/${t}`)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div id="docTabContent">
        {activeTab === 'overview' && <OverviewTab doc={doc} />}
        {activeTab === 'chat' && <ChatTab doc={doc} />}
        {activeTab === 'negotiation' && <NegotiationTab doc={doc} />}
        {activeTab === 'risk' && <RiskTab doc={doc} />}
        {activeTab === 'compliance' && <ComplianceTab doc={doc} />}
        {activeTab === 'deadlines' && <DeadlinesTab doc={doc} />}
        {activeTab === 'pii' && <PiiTab doc={doc} />}
        {activeTab === 'share' && <ShareTab doc={doc} />}
      </div>
    </div>
  );
};

export default DocumentDetail;
