import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import { fmtBytes } from '../utils/formatters';

export const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    const steps = [
      [20, 'Computing SHA-256 hash…'],
      [45, 'Encrypting with AES-256-GCM…'],
      [70, 'Extracting text (OCR / parse)…'],
      [90, 'Running AI risk scan…']
    ];

    for (const [pct, msg] of steps) {
      setProgressPct(pct);
      setProgressLabel(msg);
      await new Promise((r) => setTimeout(r, 280));
    }

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await Api.upload('/api/documents/upload', fd);

      setProgressPct(100);
      setProgressLabel('Complete.');
      setResult(res);
      toast('Document uploaded and secured', 'ok');
    } catch (err) {
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
    <div>
      <h1 className="page-title">Upload Document</h1>
      <p className="page-sub">
        Files are hashed (SHA-256), encrypted at rest (AES-256-GCM), and text-extracted for AI analysis. Supported: .txt, .pdf, .docx
      </p>

      <div className="card" style={{ maxWidth: '680px' }}>
        <div
          className={`dropzone ${isDragging ? 'drag' : ''}`}
          id="dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
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

        {uploading && (
          <div id="uploadProgress" className="mt-16">
            <div className="progress-bar">
              <div id="progressFill" style={{ width: `${progressPct}%` }} />
            </div>
            <p id="progressLabel" className="text-mid small mt-8">
              {progressLabel}
            </p>
          </div>
        )}

        {result && (
          <div id="uploadResult" className="mt-16">
            <div className="card" style={{ borderColor: 'var(--emerald)' }}>
              <div className="card-title">
                <span className="dot dot-emerald" />
                Upload Secured
              </div>
              <p className="bold">{result.name}</p>
              <p className="text-lo small">
                {fmtBytes(result.size)} · SHA-256: {result.sha256 ? result.sha256.slice(0, 24) : ''}…
              </p>
              <div className="flex gap-8 mt-12">
                <span className="badge badge-ok">
                  <Icon.check /> AES-256 Encrypted
                </span>
                <span className="badge badge-info">
                  OCR {Math.round((result.ocrConfidence || 0) * 100)}%
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
                  Risk {result.riskScore ?? '—'}/100
                </span>
              </div>
              <button
                className="btn btn-primary mt-16"
                onClick={() => navigate(`/document/${result.id}`)}
              >
                <Icon.eye /> Open AI Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
