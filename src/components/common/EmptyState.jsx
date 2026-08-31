import React from 'react';

export const EmptyState = ({ icon, title, sub, children }) => {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      <p>{sub}</p>
      {children}
    </div>
  );
};

export default EmptyState;
