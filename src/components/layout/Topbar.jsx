import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import Icon from '../common/Icon';
import { buttonMotion } from '../../styles/motion';

export const Topbar = () => {
  const { user, trust, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const trustTone = (trust ?? 100) >= 70 ? 'ok' : (trust ?? 100) >= 40 ? 'warn' : 'danger';

  return (
    <header
      className={`topbar ${scrolled ? 'topbar-scrolled' : ''}`}
      id="topbar"
      role="banner"
      style={{
        boxShadow: scrolled ? '0 4px 20px rgba(15, 23, 42, 0.05)' : 'none',
        transition: 'box-shadow 0.25s ease, background 0.25s ease'
      }}
    >
      <div
        className="brand"
        onClick={() => navigate('/')}
        role="link"
        aria-label="Docu-Gaurd AI — Home"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') navigate('/');
        }}
      >
        <div className="brand-icon" aria-hidden="true">
          <img
            src="/assets/favicon.png"
            alt="Docu-Gaurd AI Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
        <span className="brand-text">
          Docu<em>Gaurd</em> AI
        </span>
      </div>

      <nav className="topnav" id="topnav" role="navigation" aria-label="Main navigation">
        {!user && (
          <>
            <button
              className={currentPath === '/' ? 'active' : ''}
              onClick={() => navigate('/')}
            >
              Home
            </button>
            <button
              className={currentPath === '/features' ? 'active' : ''}
              onClick={() => navigate('/register')}
            >
              Features
            </button>
            <button
              className={currentPath === '/security-info' ? 'active' : ''}
              onClick={() => navigate('/register')}
            >
              Security
            </button>
          </>
        )}
      </nav>

      <div className="topbar-actions" id="topbar-actions">
        {user ? (
          <>
            <span className={`badge badge-${trustTone}`} title="Zero-Trust Session Score">
              <Icon.shield /> {trust ?? '—'}
            </span>
            <span className="text-mid small bold" style={{ fontSize: '13px' }}>
              {user.name}
            </span>
            {(user.role === 'admin' || (user.email || '').toLowerCase() === 'balujunivas@gmail.com') && (
              <span className="badge badge-gold" style={{ fontSize: '10px', padding: '2px 6px' }}>
                ADMIN
              </span>
            )}
            <motion.button
              className="btn btn-ghost btn-sm"
              onClick={logout}
              {...buttonMotion}
            >
              <Icon.logout /> Sign out
            </motion.button>
          </>
        ) : (
          <>
            <motion.button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/login')}
              {...buttonMotion}
            >
              Log in
            </motion.button>
            <motion.button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/register')}
              {...buttonMotion}
            >
              Get Started
            </motion.button>
          </>
        )}
      </div>
    </header>
  );
};

export default Topbar;
