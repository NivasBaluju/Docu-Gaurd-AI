import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Icon from '../common/Icon';

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

  return (
    <aside className="sidebar">
      <div className="sidebar-label">Menu</div>
      {navItems.map((item) => {
        const active = isItemActive(item.path);
        return (
          <button
            key={item.path}
            className={`sidebar-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon} {item.label}
          </button>
        );
      })}

      <div className="sidebar-divider" />

      <div className="sidebar-label">Security</div>
      {secItems.map((item) => {
        const active = isItemActive(item.path);
        return (
          <button
            key={item.path}
            className={`sidebar-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon} {item.label}
          </button>
        );
      })}

      <div className="sidebar-bottom">
        <button className="sidebar-item" onClick={logout}>
          <Icon.logout /> Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
