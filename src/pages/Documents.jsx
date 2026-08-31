import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';
import { fmtBytes, fmtDate } from '../utils/formatters';

export const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docA, setDocA] = useState('');
  const [docB, setDocB] = useState('');
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    try {
      const res = await Api.get('/api/documents');
      const docs = res.documents || [];
      setDocuments(docs);
      if (docs.length >= 1) setDocA(docs[0].id);
      if (docs.length >= 2) setDocB(docs[1].id);
    } catch (err) {
      toast(err.message || 'Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Permanently delete this document?')) return;
    try {
      await Api.del(`/api/documents/${id}`);
      toast('Document deleted', 'ok');
      await fetchDocuments();
    } catch (err) {
      toast(err.message || 'Failed to delete document', 'error');
    }
  };

  const handleCompare = async () => {
    if (docA === docB) {
      toast('Choose two different documents', 'error');
      return;
    }
    setComparing(true);
    setCompareResult(null);
    try {
      const res = await Api.post('/api/ai/compare', { documentIdA: docA, documentIdB: docB });
      setCompareResult(res);
    } catch (err) {
      toast(err.message || 'Comparison failed', 'error');
    } finally {
      setComparing(false);
    }
  };

  if (loading) {
    return (
      <div className="spinner-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-sub">All files are encrypted at rest with AES-256-GCM.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/upload')}>
          <Icon.upload /> Upload
        </button>
      </div>

      <div className="card" style={{ padding: '8px' }}>
        {documents.length === 0 ? (
          <EmptyState
            icon={<Icon.document />}
            title="No documents yet"
            sub="Upload your first contract to begin AI analysis."
          />
        ) : (
          documents.map((d) => {
            const tone =
              d.risk_score > 50
                ? 'badge-danger'
                : d.risk_score > 25
                ? 'badge-warn'
                : 'badge-ok';

            return (
              <div
                key={d.id}
                className="doc-row"
                onClick={() => navigate(`/document/${d.id}`)}
              >
                <div className="doc-row-inner">
                  <div className="doc-row-icon">
                    <Icon.document />
                  </div>
                  <div className="truncate">
                    <div className="doc-name truncate">{d.original_name}</div>
                    <div className="doc-meta">
                      {fmtBytes(d.size)} · {fmtDate(d.created_at)} · SHA-256{' '}
                      {d.sha256 ? d.sha256.slice(0, 12) : ''}…
                    </div>
                  </div>
                </div>
                <div className="flex gap-8" style={{ flexShrink: 0, marginLeft: '12px' }}>
                  {d.risk_score != null && (
                    <span className={`badge ${tone}`}>Risk {d.risk_score}</span>
                  )}
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={(e) => handleDelete(e, d.id)}
                    title="Delete"
                  >
                    <Icon.trash />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {documents.length >= 2 && (
        <div className="card mt-24">
          <div className="card-title">
            <span className="dot" />
            Compare Document Versions
          </div>
          <div className="grid grid-2">
            <div>
              <label>Document A</label>
              <select value={docA} onChange={(e) => setDocA(e.target.value)}>
                {documents.map((d) => (
                  <option key={`a-${d.id}`} value={d.id}>
                    {d.original_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Document B</label>
              <select value={docB} onChange={(e) => setDocB(e.target.value)}>
                {documents.map((d) => (
                  <option key={`b-${d.id}`} value={d.id}>
                    {d.original_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn btn-royal mt-16"
            onClick={handleCompare}
            disabled={comparing}
          >
            <Icon.compare /> {comparing ? 'Comparing…' : 'Compare Documents'}
          </button>

          {comparing && (
            <div className="spinner-center">
              <div className="spinner" />
            </div>
          )}

          {compareResult && (
            <div id="compareResult" className="mt-16">
              <p className="text-mid small mb-16">
                Comparing <strong>{compareResult.docA}</strong> → <strong>{compareResult.docB}</strong>
                {' '}· {compareResult.totalChanges} changes detected
              </p>
              {compareResult.changes?.length === 0 ? (
                <p className="text-lo">No differences detected.</p>
              ) : (
                compareResult.changes?.map((c, i) => (
                  <div key={i} className={`diff-item ${c.type}`}>
                    <span className={`badge ${c.type === 'added' ? 'badge-ok' : 'badge-danger'}`}>
                      {c.type?.toUpperCase()}
                    </span>
                    <span className="badge badge-neutral" style={{ marginLeft: '4px' }}>
                      {c.section}
                    </span>
                    <p style={{ margin: '8px 0 0' }}>{c.text}</p>
                    <span className="diff-impact">{c.impact}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Documents;
