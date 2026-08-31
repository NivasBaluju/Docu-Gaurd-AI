import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import PageTransition from '../components/common/PageTransition';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { buttonMotion, EASE_OUT } from '../styles/motion';

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
      toast('Contract generated and digitally signed with RSA-2048', 'ok');
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
      <h1 className="page-title">Contract Generator</h1>
      <p className="page-sub">
        Choose a contract type, fill in the details, and generate a digitally signed document.
      </p>

      <div className="card" style={{ maxWidth: '720px' }}>
        <div className="card-title">
          <span className="dot dot-gold" />
          Contract Configuration
        </div>

        <div className="input-group">
          <label htmlFor="ctypeSelect">Contract Type</label>
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
              className="grid grid-2"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
            >
              {activeTypeObj.fields.map((f) => {
                const label = f.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
                return (
                  <div key={f} className="input-group">
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
          className="btn btn-primary mt-16"
          id="genBtn"
          onClick={handleGenerate}
          disabled={generating}
          {...buttonMotion}
        >
          <Icon.pen /> {generating ? 'Generating & Signing…' : 'Generate Contract'}
        </motion.button>
      </div>

      <AnimatePresence>
        {generatedContract && (
          <motion.div
            id="contractPreviewWrap"
            className="mt-24"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            <div className="card">
              <div className="flex-between mb-16">
                <div className="card-title">
                  <span className="dot dot-emerald" />
                  Generated Contract — Digitally Signed (RSA-2048)
                </div>
                <motion.button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleDownload(generatedContract.id)}
                  {...buttonMotion}
                >
                  <Icon.download /> Download .txt
                </motion.button>
              </div>
              <div className="contract-preview" style={{ lineHeight: '1.7', fontSize: '13.5px' }}>
                {generatedContract.content}
              </div>
              <p className="text-lo small mt-16 mono" style={{ wordBreak: 'break-all', background: 'var(--off-white)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                RSA-SHA256 signature: {generatedContract.signature}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default Contracts;
