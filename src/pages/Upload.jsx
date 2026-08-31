import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import PageTransition from '../components/common/PageTransition';
import { fmtBytes } from '../utils/formatters';
import { buttonMotion, EASE_OUT } from '../styles/motion';

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
    { label: 'Securing Document with AES-256-GCM', icon: <Icon.lock /> },
    { label: 'Computing SHA-256 Cryptographic Fingerprint', icon: <Icon.check /> },
    { label: 'Extracting Legal Text & OCR', icon: <Icon.document /> },
    { label: 'Running AI Risk & Compliance Intelligence', icon: <Icon.shield /> }
  ];

  const handleFile = async (file) => {
    if (!file) return;
    setSelectedFile(file);
    setUploading(true);
    setResult(null);
    setCurrentStepIndex(0);

    // Simulate meaningful progress checkpoint progression alongside real upload
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
      toast('Document uploaded and secured', 'ok');
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
      <h1 className="page-title">Upload Document</h1>
      <p className="page-sub">
        Files are hashed (SHA-256), encrypted at rest (AES-256-GCM), and text-extracted for AI analysis. Supported: .txt, .pdf, .docx
      </p>

      <div className="card" style={{ maxWidth: '680px' }}>
        {!uploading && !result && (
          <div
            className={`dropzone ${isDragging ? 'drag' : ''}`}
            id="dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              transition: 'border-color 0.2s ease, background 0.2s ease',
              background: isDragging ? 'var(--royal-light)' : 'transparent'
            }}
          >
            <div className="dropzone-icon">
              <Icon.upload />
            </div>
            <h3>Drag &amp; drop a file here</h3>
            <p>or click to browse — max 25 MB</p>
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
          </div>
        )}

        {/* Meaningful Pipeline Checkpoints */}
        {uploading && !result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            style={{ padding: '8px 0' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div className="brand-icon" style={{ width: '38px', height: '38px' }}>
                <Icon.document stroke="white" />
              </div>
              <div>
                <strong style={{ color: 'var(--navy)' }}>{selectedFile?.name}</strong>
                <p className="text-lo small">{fmtBytes(selectedFile?.size || 0)}</p>
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
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: isCurrent ? 'var(--royal-light)' : 'var(--off-white)',
                      border: isCurrent ? '1px solid var(--royal)' : '1px solid var(--border)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isComplete ? 'var(--emerald)' : isCurrent ? 'var(--royal)' : 'var(--mid-gray)',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        flexShrink: 0
                      }}
                    >
                      {isComplete ? <Icon.check /> : idx + 1}
                    </div>
                    <span
                      style={{
                        fontSize: '13.5px',
                        fontWeight: isCurrent ? '600' : '400',
                        color: isCurrent ? 'var(--royal)' : isComplete ? 'var(--navy)' : 'var(--text-lo)'
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
              className="mt-16"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              <div className="card" style={{ borderColor: 'var(--emerald)', background: 'var(--white)' }}>
                <div className="card-title">
                  <span className="dot dot-emerald" />
                  Upload Secured &amp; Analyzed
                </div>
                <p className="bold" style={{ fontSize: '16px', color: 'var(--navy)' }}>{result.name}</p>
                <p className="text-lo small">
                  {fmtBytes(result.size)} · SHA-256: {result.sha256 ? result.sha256.slice(0, 24) : ''}…
                </p>
                <div className="flex gap-8 mt-12" style={{ flexWrap: 'wrap' }}>
                  <span className="badge badge-ok">
                    <Icon.check /> AES-256 Encrypted
                  </span>
                  <span className="badge badge-info">
                    OCR {Math.round((result.ocrConfidence || 0) * 100)}%
                  </span>
                  <span
                    className={`badge ${result.riskScore > 50
                        ? 'badge-danger'
                        : result.riskScore > 25
                          ? 'badge-warn'
                          : 'badge-ok'
                      }`}
                  >
                    Risk {result.riskScore ?? '—'}/100
                  </span>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <motion.button
                    className="btn btn-primary"
                    onClick={() => navigate(`/document/${result.id}`)}
                    {...buttonMotion}
                  >
                    <Icon.eye /> Open AI Analysis Workspace
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
                    Upload Another
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
