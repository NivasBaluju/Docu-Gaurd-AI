import React from 'react';

export const Footer = () => {
  return (
    <footer className="footer" id="main-footer" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-brand">Docu-Gaurd AI</div>
        <div className="footer-badges">
          <span className="badge badge-neutral">AES-256-GCM</span>
          <span className="badge badge-neutral">Zero-Trust</span>
          <span className="badge badge-neutral">SHA-256 Integrity</span>
          <span className="badge badge-neutral">Immutable Audit</span>
        </div>
        <div className="footer-text">© 2025 Docu-Gaurd AI · Enterprise Legal Intelligence</div>
      </div>
    </footer>
  );
};

export default Footer;
