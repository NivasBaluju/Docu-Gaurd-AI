import React from 'react';
import PortfolioDashboard from '../components/portfolio/PortfolioDashboard';
import PageTransition from '../components/common/PageTransition';

export const Portfolio = () => {
  return (
    <PageTransition>
      <div style={{ paddingBottom: '48px' }}>
        <PortfolioDashboard />
      </div>
    </PageTransition>
  );
};

export default Portfolio;
