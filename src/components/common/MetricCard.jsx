import React from 'react';

export const MetricCard = ({ icon, iconCls = 'metric-icon-blue', value, label, badgeCls, badgeText }) => {
  return (
    <div className="card">
      <div className="metric-row">
        <div className={`metric-icon-wrap ${iconCls}`}>{icon}</div>
        <div>
          <div className="metric-value">{value}</div>
          <div className="metric-label">{label}</div>
          {badgeCls && (
            <div className="mt-8">
              <span className={`badge ${badgeCls}`} style={{ fontSize: '10.5px' }}>
                {badgeText || label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
