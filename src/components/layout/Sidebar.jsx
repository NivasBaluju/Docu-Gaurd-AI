import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import Icon from '../common/Icon';
import { DURATIONS, EASE_OUT } from '../../styles/motion';

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const pathname = location.pathname;

  const navItems = [
    { path: '/dashboard', icon: <Icon.grid />, label: 'Dashboard' },
    { path: '/documents', icon: <Icon.document />, label: 'Documents' },
    { path: '/upload', icon: <Icon.upload />, label: 'Upload Document' },
    { path: '/contracts', icon: <Icon.pen />, label: 'Generate Contract' },
    { path: '/deadlines', icon: <Icon.calendar />, label: 'Deadlines' },
  ];

  const secItems = [
    { path: '/security', icon: <Icon.shield />, label: 'Security Center' },
  ];

  const isDocDetail = pathname.startsWith('/document/');

  const isItemActive = (itemPath) => {
    if (itemPath === '/documents' && isDocDetail) return true;
    return pathname === itemPath || pathname.startsWith(itemPath + '/');
  };

  const renderNavButton = (item) => {
    const active = isItemActive(item.path);
    return (
      <button
        key={item.path}
        className={`sidebar-item ${active ? 'active' : ''}`}
        onClick={() => navigate(item.path)}
        style={{ position: 'relative' }}
      >
        {active && (
          <motion.div
            layoutId="activeSidebarIndicator"
            style={{
              position: 'absolute',
              left: 0,
              top: '15%',
              bottom: '15%',
              width: '3px',
              backgroundColor: 'var(--royal)',
              borderRadius: '0 4px 4px 0'
            }}
            transition={{ duration: DURATIONS.fast, ease: EASE_OUT }}
          />
        )}
        {item.icon}
        <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-label">Menu</div>
      {navItems.map(renderNavButton)}

      <div className="sidebar-divider" />

      <div className="sidebar-label">Security</div>
      {secItems.map(renderNavButton)}

      <div className="sidebar-bottom">
        <button className="sidebar-item" onClick={logout}>
          <Icon.logout /> Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
