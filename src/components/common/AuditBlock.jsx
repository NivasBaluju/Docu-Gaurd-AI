import React from 'react';
import { fmtDate } from '../../utils/formatters';

export const AuditBlock = ({ block }) => {
  if (!block) return null;
  return (
    <div className="audit-block">
      <span className="action">#{block.block_index} {block.action}</span><br />
      <span className="text-lo">{fmtDate(block.created_at)}</span><br />
      <span style={{ fontSize: '11px' }}>hash: {block.hash ? block.hash.slice(0, 28) : ''}…</span>
    </div>
  );
};

export default AuditBlock;
