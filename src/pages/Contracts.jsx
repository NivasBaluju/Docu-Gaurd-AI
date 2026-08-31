import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import PageTransition from '../components/common/PageTransition';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { buttonMotion, EASE_OUT, cardHoverMotion } from '../styles/motion';

export const Contracts = () => {
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [formValues, setFormValues] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generatedContract, setGeneratedContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    async function loadContractTypes() {
      try {
        const res = await Api.get('/api/contracts/types');
        if (isMounted) {
          const tList = res.types || [];
          setTypes(tList);
          if (tList.length > 0) {
            setSelectedType(tList[0].id);
          }
        }
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to load contract types', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadContractTypes();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const activeTypeObj = types.find((t) => t.id === selectedType);

  const handleFieldChange = (fieldName, value) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleGenerate = async () => {
    if (!selectedType) return;
    setGenerating(true);
    try {
      const params = {};
      if (activeTypeObj && activeTypeObj.fields) {
        activeTypeObj.fields.forEach((f) => {
          if (formValues[f]) params[f] = formValues[f];
        });
      }

      const res = await Api.post('/api/contracts/generate', {
        type: selectedType,
        params
      });
      setGeneratedContract(res);
      toast('Contract drafted and cryptographically signed with RSA-2048', 'ok');
    } catch (err) {
      toast(err.message || 'Failed to generate contract', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (contractId) => {
    try {
      const { contract } = await Api.get(`/api/contracts/${contractId}`);
      const blob = new Blob([contract.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contract.contract_type}_${contractId.slice(0, 8)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(err.message || 'Download failed', 'error');
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <SkeletonLoader.Text lines={2} width="320px" />
        <div style={{ marginTop: '20px' }}>
          <SkeletonLoader.Card count={1} height="280px" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mb-24">
        <span className="eyebrow-bullet">Legal Authoring Studio</span>
        <h1 className="page-title" style={{ marginTop: '4px' }}>Contract Studio</h1>
        <p className="page-sub" style={{ maxWidth: '680px' }}>
          Author legally binding instruments with dynamic parameter configuration and automated RSA-2048 cryptographic digital signing.
        </p>
      </div>

      <div className="split" style={{ alignItems: 'flex-start' }}>
        {/* Left: Configuration Form */}
        <motion.div className="card" {...cardHoverMotion}>
          <div className="card-title">
            <span className="dot dot-gold" />
            1. Select &amp; Configure Instrument
          </div>

          <div className="input-group">
            <label htmlFor="ctypeSelect">Legal Instrument Type</label>
            <select
              id="ctypeSelect"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setFormValues({});
              }}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <AnimatePresence mode="wait">
            {activeTypeObj && activeTypeObj.fields && (
              <motion.div
                key={selectedType}
                id="ctypeFields"
                className="grid"
                style={{ gap: '14px' }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                {activeTypeObj.fields.map((f) => {
                  const label = f.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
                  return (
                    <div key={f} className="input-group" style={{ marginBottom: 0 }}>
                      <label>{label}</label>
                      <input
                        name={f}
                        value={formValues[f] || ''}
                        onChange={(e) => handleFieldChange(f, e.target.value)}
                        placeholder={`Enter ${label.toLowerCase()}`}
                      />
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            className="btn btn-primary btn-block mt-24"
            id="genBtn"
            onClick={handleGenerate}
            disabled={generating}
            {...buttonMotion}
          >
            <Icon.pen /> {generating ? 'Synthesizing & Digitally Signing…' : 'Generate & Cryptographically Sign'}
          </motion.button>
        </motion.div>

        {/* Right: Contract Overview / Information */}
        <div>
          <div className="card mb-16" style={{ background: 'var(--canvas-bg)' }}>
            <div className="card-title" style={{ fontSize: '16px' }}>
              <span className="dot dot-emerald" />
              Institutional Signing Standards
            </div>
            <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: 'var(--ink-secondary)', marginBottom: '12px' }}>
              All synthesized agreements are appended with an RSA-2048 PKCS#1v15 digital signature and logged directly to the firm's tamper-evident blockchain audit ledger.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-ok"><Icon.check /> RSA-2048</span>
              <span className="badge badge-gold"><Icon.shield /> SHA-256 Digest</span>
              <span className="badge badge-neutral">Standard Bilateral</span>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Contract Document View */}
      <AnimatePresence>
        {generatedContract && (
          <motion.div
            id="contractPreviewWrap"
            className="mt-24"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            <div className="card" style={{ padding: '32px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--gold-border)' }}>
              <div className="flex-between mb-16">
                <div>
                  <span className="badge badge-gold mb-8"><Icon.shield /> Digitally Executed</span>
                  <h3 style={{ fontSize: '22px', color: 'var(--ink-primary)' }}>
                    {activeTypeObj?.label || 'Generated Contract'}
                  </h3>
                </div>
                <motion.button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleDownload(generatedContract.id)}
                  {...buttonMotion}
                >
                  <Icon.download /> Export Contract (.txt)
                </motion.button>
              </div>

              <div
                className="doc-text"
                style={{
                  maxHeight: '400px',
                  background: 'var(--canvas-bg)',
                  padding: '24px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  lineHeight: '1.8'
                }}
              >
                {generatedContract.content}
              </div>

              <div
                className="mono small mt-16"
                style={{
                  background: 'var(--surface-cream)',
                  border: '1px solid var(--border-hairline)',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink-secondary)',
                  wordBreak: 'break-all',
                  fontSize: '12px'
                }}
              >
                <strong style={{ color: 'var(--gold-seal)' }}>RSA-2048 Digital Signature:</strong><br />
                {generatedContract.signature}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default Contracts;
