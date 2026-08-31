import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import PageTransition from '../components/common/PageTransition';
import { fmtBytes } from '../utils/formatters';
import { buttonMotion, EASE_OUT, cardHoverMotion } from '../styles/motion';

export const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const pipelineSteps = [
    { label: 'Symmetric Envelope: AES-256-GCM Encryption', icon: <Icon.lock /> },
    { label: 'Evidentiary Cryptographic Fingerprint (SHA-256)', icon: <Icon.check /> },
    { label: 'Neural Legal Text Extraction & OCR Parsing', icon: <Icon.document /> },
    { label: 'Automated Heuristic Risk & Compliance Intelligence', icon: <Icon.shield /> }
  ];

  const handleFile = async (file) => {
    if (!file) return;
    setSelectedFile(file);
    setUploading(true);
    setResult(null);
    setCurrentStepIndex(0);

    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < 3 ? prev + 1 : prev));
    }, 450);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await Api.upload('/api/documents/upload', fd);

      clearInterval(stepInterval);
      setCurrentStepIndex(4);
      setResult(res);
      toast('Document ingested and cryptographically sealed', 'ok');
    } catch (err) {
      clearInterval(stepInterval);
      setUploading(false);
      toast(err.message || 'Upload failed', 'error');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <PageTransition>
      <div className="mb-24">
        <span className="eyebrow-bullet">Secure Document Ingestion</span>
        <h1 className="page-title" style={{ marginTop: '4px' }}>Document Arrival Chamber</h1>
        <p className="page-sub" style={{ maxWidth: '640px' }}>
          Every file is cryptographically fingerprinted (SHA-256), encrypted at rest (AES-256-GCM), and structured for multi-pass AI reasoning. Supported: PDF, DOCX, TXT (up to 25 MB).
        </p>
      </div>

      <div style={{ maxWidth: '740px' }}>
        {!uploading && !result && (
          <motion.div
            className={`dropzone ${isDragging ? 'drag' : ''}`}
            id="dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            {...cardHoverMotion}
            style={{
              padding: '64px 32px',
              background: isDragging ? 'var(--royal-light)' : 'var(--surface-white)',
              borderColor: isDragging ? 'var(--royal-cobalt)' : 'var(--border-mid)',
              boxShadow: 'var(--shadow-md)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <div className="dropzone-icon">
              <Icon.upload />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--ink-primary)' }}>
              Place legal instrument into the Chamber
            </h3>
            <p style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>
              Drag &amp; drop file here, or <strong style={{ color: 'var(--royal-cobalt)' }}>browse your computer</strong>
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              <span className="badge badge-neutral">PDF</span>
              <span className="badge badge-neutral">DOCX</span>
              <span className="badge badge-neutral">TXT</span>
              <span className="badge badge-gold"><Icon.shield /> AES-256-GCM</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              id="fileInput"
              style={{ display: 'none' }}
              accept=".txt,.pdf,.docx,.doc,image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
          </motion.div>
        )}

        {/* Meaningful Pipeline Checkpoints */}
        {uploading && !result && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            style={{ padding: '32px', boxShadow: 'var(--shadow-lg)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
              <div className="metric-icon-wrap metric-icon-blue">
                <Icon.document />
              </div>
              <div>
                <strong style={{ fontSize: '16px', color: 'var(--ink-primary)' }}>{selectedFile?.name}</strong>
                <p className="small text-muted">{fmtBytes(selectedFile?.size || 0)} · Cryptographic Pipeline Active</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pipelineSteps.map((step, idx) => {
                const isComplete = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '12px 18px',
                      borderRadius: 'var(--radius-sm)',
                      background: isCurrent ? 'var(--royal-light)' : 'var(--canvas-bg)',
                      border: isCurrent ? '1px solid var(--royal-border)' : '1px solid var(--border-hairline)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isComplete ? 'var(--emerald)' : isCurrent ? 'var(--royal-cobalt)' : 'var(--ink-subtle)',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: '700',
                        flexShrink: 0
                      }}
                    >
                      {isComplete ? <Icon.check /> : idx + 1}
                    </div>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: isCurrent ? '600' : '500',
                        color: isCurrent ? 'var(--royal-cobalt)' : isComplete ? 'var(--ink-primary)' : 'var(--ink-muted)'
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Ready / Success State */}
        <AnimatePresence>
          {result && (
            <motion.div
              id="uploadResult"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              <div className="card" style={{ border: '1px solid var(--emerald-border)', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
                <div className="flex-between mb-16">
                  <div className="card-title" style={{ margin: 0 }}>
                    <span className="dot dot-emerald" />
                    Document Secured &amp; Analyzed
                  </div>
                  <span className="badge badge-ok">
                    <Icon.check /> Ready for Review
                  </span>
                </div>
                <h3 style={{ fontSize: '20px', color: 'var(--ink-primary)', marginBottom: '4px' }}>
                  {result.name}
                </h3>
                <p className="mono text-muted small" style={{ marginBottom: '16px' }}>
                  {fmtBytes(result.size)} · SHA-256: {result.sha256 ? result.sha256.slice(0, 32) : ''}…
                </p>

                <div className="flex gap-8 mb-24" style={{ flexWrap: 'wrap' }}>
                  <span className="badge badge-ok">
                    <Icon.check /> AES-256-GCM Encrypted
                  </span>
                  <span className="badge badge-info">
                    OCR Confidence: {Math.round((result.ocrConfidence || 0) * 100)}%
                  </span>
                  <span
                    className={`badge ${
                      result.riskScore > 50
                        ? 'badge-danger'
                        : result.riskScore > 25
                        ? 'badge-warn'
                        : 'badge-ok'
                    }`}
                  >
                    Risk Score: {result.riskScore ?? '—'}/100
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <motion.button
                    className="btn btn-primary"
                    onClick={() => navigate(`/document/${result.id}`)}
                    {...buttonMotion}
                  >
                    <Icon.eye /> Launch Document Analysis Workspace
                  </motion.button>
                  <motion.button
                    className="btn btn-outline"
                    onClick={() => {
                      setResult(null);
                      setUploading(false);
                      setSelectedFile(null);
                    }}
                    {...buttonMotion}
                  >
                    Ingest Another File
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default Upload;
