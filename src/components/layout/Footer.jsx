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
        background: '#000000',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '56px 24px 36px',
        color: '#71717A',
        fontSize: '13px',
        lineHeight: '1.6'
      }}
    >
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
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
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000000'
                }}
              >
                <Icon.shield />
              </div>
              <strong style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: '700' }}>Docu-Gaurd AI</strong>
            </div>
            <p style={{ color: '#71717A', fontSize: '13px', lineHeight: '1.6' }}>
              Enterprise legal intelligence &amp; document verification platform. Engineered for law firms and general counsel.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E' }} />
              <span style={{ color: '#E4E4E7', fontWeight: '500', fontSize: '12px' }}>Chamber Operational</span>
            </div>
          </div>

          {/* Column 2: Platform */}
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: '12px', fontSize: '13px' }}>Platform</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><Link to="/upload" style={{ color: '#A1A1AA' }}>Document Ingestion</Link></li>
              <li><Link to="/contracts" style={{ color: '#A1A1AA' }}>Contract Authoring Studio</Link></li>
              <li><Link to="/deadlines" style={{ color: '#A1A1AA' }}>Deadline &amp; Expiry Tracker</Link></li>
              <li><Link to="/security" style={{ color: '#A1A1AA' }}>Zero-Trust Security Center</Link></li>
            </ul>
          </div>

          {/* Column 3: Cryptography & Security */}
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: '12px', fontSize: '13px' }}>Security &amp; Standards</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ color: '#A1A1AA' }}>AES-256-GCM Envelope Encryption</li>
              <li style={{ color: '#A1A1AA' }}>RSA-2048 PKCS#1v15 Signatures</li>
              <li style={{ color: '#A1A1AA' }}>SHA-256 Blockchain Audit Chain</li>
              <li style={{ color: '#A1A1AA' }}>Hardware TOTP Multi-Factor Auth</li>
            </ul>
          </div>

          {/* Column 4: Compliance */}
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: '12px', fontSize: '13px' }}>Compliance</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ color: '#A1A1AA' }}>SOC 2 Type II Certified</li>
              <li style={{ color: '#A1A1AA' }}>GDPR Article 32 Compliant</li>
              <li style={{ color: '#A1A1AA' }}>Indian Information Technology Act</li>
              <li style={{ color: '#A1A1AA' }}>ISO/IEC 27001 Certified</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ color: '#71717A', fontSize: '12px' }}>
            Copyright © {new Date().getFullYear()} Docu-Gaurd AI Inc. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '18px', fontSize: '12px' }}>
            <span style={{ color: '#71717A' }}>Privacy Policy</span>
            <span style={{ color: '#71717A' }}>Terms of Service</span>
            <span style={{ color: '#71717A' }}>Security Disclosure</span>
            <span style={{ color: '#71717A' }}>Legal Notice</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
