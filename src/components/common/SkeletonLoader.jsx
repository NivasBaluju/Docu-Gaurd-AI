import React from 'react';

export const SkeletonText = ({ lines = 3, width = '100%' }) => (
  <div style={{ width }}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="skeleton skeleton-text"
        style={{
          width: i === lines - 1 && lines > 1 ? '70%' : '100%',
          height: '14px'
        }}
      />
    ))}
  </div>
);

export const SkeletonCard = ({ count = 1, height = '120px' }) => (
  <div className="grid grid-2" style={{ gap: '16px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="skeleton skeleton-card"
        style={{ height, background: 'var(--white)', border: '1px solid var(--border)' }}
      />
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 4 }) => (
  <div className="card">
    <div className="skeleton skeleton-title" style={{ width: '40%' }} />
    <div style={{ marginTop: '16px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: '48px', marginBottom: '8px', width: '100%' }}
        />
      ))}
    </div>
  </div>
);

export default {
  Text: SkeletonText,
  Card: SkeletonCard,
  Table: SkeletonTable
};
