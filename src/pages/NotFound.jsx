import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
      <EmptyState
        icon={<Icon.alert />}
        title="Page not found"
        sub="The page you're looking for doesn't exist."
      />
      <button className="btn btn-primary mt-16" onClick={() => navigate('/')}>
        Go Home
      </button>
    </div>
  );
};

export default NotFound;
