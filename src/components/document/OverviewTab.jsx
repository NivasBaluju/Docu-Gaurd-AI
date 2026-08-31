import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import { esc } from '../../utils/formatters';

export const OverviewTab = ({ doc }) => {
  const [clauses, setClauses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simplified, setSimplified] = useState(null);
  const [simplifying, setSimplifying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    async function loadClauses() {
      try {
        const res = await Api.get(`/api/ai/documents/${doc.id}/clauses`);
        if (isMounted) setClauses(res.clauses || {});
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to extract clauses', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadClauses();
    return () => {
      isMounted = false;
    };
  }, [doc.id, toast]);

  const handleSimplify = async () => {
    setSimplifying(true);
    try {
      const res = await Api.get(`/api/ai/documents/${doc.id}/simplify`);
      setSimplified(res.simplified);
    } catch (err) {
      toast(err.message || 'Failed to simplify document text', 'error');
    } finally {
      setSimplifying(false);
    }
  };

  const getHighlightedText = () => {
    if (!doc.extracted_text) return '(no extractable text)';
    if (!clauses) return esc(doc.extracted_text);

    const allExcerpts = Object.values(clauses).flatMap((c) => c.excerpts || []);
    let html = esc(doc.extracted_text);
    for (const ex of allExcerpts) {
      if (ex.text) {
        const escaped = esc(ex.text);
        html = html.split(escaped).join(`<mark>${escaped}</mark>`);
      }
    }
    return html;
  };

  if (loading) {
    return (
      <div className="spinner-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="split">
      <div className="card">
        <div className="card-title">
          <span className="dot" />
          Document Text
        </div>
        <div
          className="doc-text"
          dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
        />

        <button
          className="btn btn-outline btn-sm mt-16"
          onClick={handleSimplify}
          disabled={simplifying}
        >
          <Icon.chat /> {simplifying ? 'Translating…' : 'Plain-Language Translation'}
        </button>

        {simplifying && (
          <div className="spinner-center">
            <div className="spinner" />
          </div>
        )}

        {simplified && (
          <div id="simplifiedArea" className="mt-16">
            <div className="card" style={{ background: 'var(--emerald-bg)', borderColor: 'rgba(5,150,105,0.2)' }}>
              <div className="card-title">
                <span className="dot dot-emerald" />
                Plain English Summary
              </div>
              <div className="doc-text">{simplified}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          <span className="dot dot-gold" />
          Extracted Clauses
        </div>
        {clauses &&
          Object.entries(clauses).map(([key, c]) => (
            <div key={key} className={`clause-item ${c.found ? '' : 'not-found'}`}>
              <h4>{c.label}{c.found ? '' : ' — not found'}</h4>
              {c.excerpts && c.excerpts.length > 0 ? (
                c.excerpts.map((e, idx) => <p key={idx}>{e.text}</p>)
              ) : (
                <p className="text-lo">No matching clause detected.</p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default OverviewTab;
