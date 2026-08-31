import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Icon from '../common/Icon';

export const Topbar = () => {
  const { user, trust, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const trustTone = (trust ?? 100) >= 70 ? 'ok' : (trust ?? 100) >= 40 ? 'warn' : 'danger';

  return (
    <header className="topbar" id="topbar" role="banner">
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
          <Icon.shield stroke="white" strokeWidth="1.6" />
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
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              <Icon.logout /> Sign out
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>
              Log in
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>
              Get Started
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Topbar;
