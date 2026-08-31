import React, { useState } from 'react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import { fmtDate } from '../../utils/formatters';

export const ShareTab = ({ doc }) => {
  const [password, setPassword] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('');
  const [maxDownloads, setMaxDownloads] = useState('');
  const [shareResult, setShareResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await Api.post('/api/share', {
        documentId: doc.id,
        password: password || undefined,
        expiresInHours: expiresInHours ? Number(expiresInHours) : undefined,
        maxDownloads: maxDownloads ? Number(maxDownloads) : undefined
      });
      setShareResult(res);
      toast('Secure share link created', 'ok');
    } catch (err) {
      toast(err.message || 'Failed to create share link', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <span className="dot dot-gold" />
        Secure Link Sharing
      </div>

      <form id="shareForm" onSubmit={handleSubmit}>
        <div className="grid grid-3">
          <div>
            <label>Password (optional)</label>
            <input
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for none"
            />
          </div>
          <div>
            <label>Expires in (hours)</label>
            <input
              name="expiresInHours"
              type="number"
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(e.target.value)}
              placeholder="e.g. 48"
            />
          </div>
          <div>
            <label>Max downloads</label>
            <input
              name="maxDownloads"
              type="number"
              value={maxDownloads}
              onChange={(e) => setMaxDownloads(e.target.value)}
              placeholder="e.g. 3"
            />
          </div>
        </div>

        <button className="btn btn-royal mt-16" type="submit" disabled={submitting}>
          <Icon.link /> {submitting ? 'Generating…' : 'Generate Secure Link'}
        </button>
      </form>

      {shareResult && (
        <div id="shareResult" className="mt-16">
          <div
            className="card"
            style={{ background: 'var(--emerald-bg)', borderColor: 'rgba(5,150,105,0.2)' }}
          >
            <p className="mono small" style={{ wordBreak: 'break-all' }}>
              {window.location.origin}{shareResult.url}
            </p>
            <p className="text-mid small mt-8">
              {shareResult.passwordProtected ? (
                <>
                  <Icon.lock /> Password protected ·{' '}
                </>
              ) : null}
              {shareResult.expiresAt
                ? `Expires ${fmtDate(shareResult.expiresAt)}`
                : 'No expiry'}{' '}
              ·{' '}
              {shareResult.maxDownloads
                ? `${shareResult.maxDownloads} downloads max`
                : 'Unlimited downloads'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareTab;
