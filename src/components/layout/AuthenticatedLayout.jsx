import React from 'react';
import Sidebar from './Sidebar';

export const AuthenticatedLayout = ({ children }) => {
  return (
    <div className="authenticated-layout">
      <Sidebar />
      <div className="page-content fade-up">{children}</div>
    </div>
  );
};

export default AuthenticatedLayout;
