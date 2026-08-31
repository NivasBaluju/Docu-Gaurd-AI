import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';

export const Footer = () => {
  return (
    <footer
      className="footer"
      id="main-footer"
      role="contentinfo"
      style={{
        background: '#F5F5F7',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        padding: '56px 24px 36px',
        color: '#6E6E73',
        fontSize: '13px',
        lineHeight: '1.6'
      }}
    >
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Top 4-Column Directory */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '36px',
            marginBottom: '48px'
          }}
        >
          {/* Column 1: Brand & Philosophy */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: '#1D1D1F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}
              >
                <Icon.shield />
              </div>
              <strong style={{ color: '#1D1D1F', fontSize: '15px', fontWeight: '700' }}>Docu-Gaurd AI</strong>
            </div>
            <p style={{ color: '#86868B', fontSize: '13px', lineHeight: '1.6' }}>
              Enterprise legal intelligence &amp; document verification platform. Engineered for law firms and general counsel.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34C759' }} />
              <span style={{ color: '#1D1D1F', fontWeight: '500', fontSize: '12px' }}>All Systems Operational</span>
            </div>
          </div>

          {/* Column 2: Platform */}
          <div>
            <div style={{ color: '#1D1D1F', fontWeight: '600', marginBottom: '12px', fontSize: '13px' }}>Platform</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><Link to="/upload" style={{ color: '#6E6E73' }}>Document Ingestion</Link></li>
              <li><Link to="/contracts" style={{ color: '#6E6E73' }}>Contract Authoring Studio</Link></li>
              <li><Link to="/deadlines" style={{ color: '#6E6E73' }}>Deadline &amp; Expiry Tracker</Link></li>
              <li><Link to="/security" style={{ color: '#6E6E73' }}>Zero-Trust Security Center</Link></li>
            </ul>
          </div>

          {/* Column 3: Cryptography & Security */}
          <div>
            <div style={{ color: '#1D1D1F', fontWeight: '600', marginBottom: '12px', fontSize: '13px' }}>Security &amp; Standards</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ color: '#6E6E73' }}>AES-256-GCM Envelope Encryption</li>
              <li style={{ color: '#6E6E73' }}>RSA-2048 PKCS#1v15 Signatures</li>
              <li style={{ color: '#6E6E73' }}>SHA-256 Blockchain Audit Chain</li>
              <li style={{ color: '#6E6E73' }}>Hardware TOTP Multi-Factor Auth</li>
            </ul>
          </div>

          {/* Column 4: Compliance */}
          <div>
            <div style={{ color: '#1D1D1F', fontWeight: '600', marginBottom: '12px', fontSize: '13px' }}>Compliance</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ color: '#6E6E73' }}>SOC 2 Type II Certified</li>
              <li style={{ color: '#6E6E73' }}>GDPR Article 32 Compliant</li>
              <li style={{ color: '#6E6E73' }}>Indian Information Technology Act</li>
              <li style={{ color: '#6E6E73' }}>ISO/IEC 27001 Certified</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
            paddingTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ color: '#86868B', fontSize: '12px' }}>
            Copyright © {new Date().getFullYear()} Docu-Gaurd AI Inc. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '18px', fontSize: '12px' }}>
            <span style={{ color: '#86868B' }}>Privacy Policy</span>
            <span style={{ color: '#86868B' }}>Terms of Service</span>
            <span style={{ color: '#86868B' }}>Security Disclosure</span>
            <span style={{ color: '#86868B' }}>Legal Notice</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
