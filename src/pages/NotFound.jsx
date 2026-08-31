import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';
import PageTransition from '../components/common/PageTransition';
import { buttonMotion } from '../styles/motion';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <EmptyState
          icon={<Icon.alert />}
          title="Page not found"
          sub="The page you're looking for doesn't exist or has moved."
        />
        <motion.button
          className="btn btn-primary mt-16"
          onClick={() => navigate('/')}
          {...buttonMotion}
        >
          Go Home
        </motion.button>
      </div>
    </PageTransition>
  );
};

export default NotFound;
