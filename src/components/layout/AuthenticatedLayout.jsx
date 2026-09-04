import React from 'react';
import Sidebar from './Sidebar';

/**
 * AuthenticatedLayout
 * Two-column desktop executive cockpit:
 * - 264px left navigation sidebar, sticky under the 88px Topbar
 * - Fluid flex-1 page content area occupying the full remaining viewport width
 */
export const AuthenticatedLayout = ({ children }) => {
  return (
    <div className="authenticated-layout flex flex-col lg:flex-row w-full min-h-[calc(100vh-88px)] mt-[88px]">
      <Sidebar />
      <main className="page-content flex-1 min-w-0 p-6 lg:p-10 overflow-x-hidden bg-transparent">
        {children}
      </main>
    </div>
  );
};

export default AuthenticatedLayout;
