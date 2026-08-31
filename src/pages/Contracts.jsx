import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';

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
      toast('Contract generated and signed', 'ok');
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
      <div className="spinner-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
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
          <label htmlFor="ctypeSelect">Contract type</label>
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

        {activeTypeObj && activeTypeObj.fields && (
          <div id="ctypeFields" className="grid grid-2">
            {activeTypeObj.fields.map((f) => {
              const label = f.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
              return (
                <div key={f} className="input-group">
                  <label>{label}</label>
                  <input
                    name={f}
                    value={formValues[f] || ''}
                    onChange={(e) => handleFieldChange(f, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        )}

        <button
          className="btn btn-primary mt-16"
          id="genBtn"
          onClick={handleGenerate}
          disabled={generating}
        >
          <Icon.pen /> {generating ? 'Generating…' : 'Generate Contract'}
        </button>
      </div>

      {generatedContract && (
        <div id="contractPreviewWrap" className="mt-24">
          <div className="card">
            <div className="flex-between mb-16">
              <div className="card-title">
                <span className="dot dot-emerald" />
                Generated Contract — Digitally Signed
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleDownload(generatedContract.id)}
              >
                <Icon.download /> Download .txt
              </button>
            </div>
            <div className="contract-preview">{generatedContract.content}</div>
            <p className="text-lo small mt-16 mono">
              RSA-SHA256 signature:{' '}
              {generatedContract.signature ? generatedContract.signature.slice(0, 52) : ''}…
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;
