import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import SkeletonLoader from '../common/SkeletonLoader';
import { esc } from '../../utils/formatters';
import { buttonMotion, EASE_OUT } from '../../styles/motion';

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
    return <SkeletonLoader.Card count={2} height="360px" />;
  }

  return (
    <div className="split">
      <div className="card">
        <div className="card-title">
          <span className="dot" />
          Document Text Viewer
        </div>
        <div
          className="doc-text"
          dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
          style={{ maxHeight: '480px', overflowY: 'auto', lineHeight: '1.75' }}
        />

        <motion.button
          className="btn btn-outline btn-sm mt-16"
          onClick={handleSimplify}
          disabled={simplifying}
          {...buttonMotion}
        >
          <Icon.chat /> {simplifying ? 'Translating to Plain English…' : 'Plain-Language Translation'}
        </motion.button>

        <AnimatePresence>
          {simplified && (
            <motion.div
              id="simplifiedArea"
              className="mt-16"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
            >
              <div className="card" style={{ background: 'var(--emerald-bg)', borderColor: 'rgba(5,150,105,0.2)' }}>
                <div className="card-title">
                  <span className="dot dot-emerald" />
                  Plain English Summary
                </div>
                <div className="doc-text" style={{ fontSize: '13.5px', lineHeight: '1.7' }}>{simplified}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="card">
        <div className="card-title">
          <span className="dot dot-gold" />
          Extracted Clauses
        </div>
        {clauses &&
          Object.entries(clauses).map(([key, c]) => (
            <div
              key={key}
              className={`clause-item ${c.found ? '' : 'not-found'}`}
              style={{ transition: 'border-color 0.2s ease, transform 0.15s ease' }}
            >
              <h4>{c.label}{c.found ? '' : ' — not detected'}</h4>
              {c.excerpts && c.excerpts.length > 0 ? (
                c.excerpts.map((e, idx) => <p key={idx}>{e.text}</p>)
              ) : (
                <p className="text-lo">No matching clause detected in document.</p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default OverviewTab;
