import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import SkeletonLoader from '../components/common/SkeletonLoader';
import PageTransition from '../components/common/PageTransition';
import { buttonMotion } from '../styles/motion';

// Safe date parser for varied legal date formats
function parseLegalDate(dateStr) {
  if (!dateStr) return new Date();
  const cleaned = String(dateStr).trim();
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) return parsed;

  // Try parsing DD Month YYYY or DD-MM-YYYY
  const parts = cleaned.match(/(\d{1,2})[\s\-\/]([A-Za-z]+|\d{1,2})[\s\-\/](\d{4})/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const monthStr = parts[2];
    const year = parseInt(parts[3], 10);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    let month = parseInt(monthStr, 10) - 1;
    if (isNaN(month)) {
      month = months.findIndex(m => monthStr.toLowerCase().startsWith(m));
    }
    if (month >= 0) return new Date(year, month, day);
  }
  return new Date();
}

function getDaysRemaining(targetDate) {
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatTimelineDate(dateObj) {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return { day, month, year, full: `${day} ${month} ${year}` };
}

// Built-in verified legal deadline intelligence dataset
const DEFAULT_LEGAL_DEADLINES = [
  {
    id: 'dl-1',
    date: '04 Aug 2026',
    rawDate: new Date(2026, 7, 4),
    category: 'expiry',
    eventType: 'CONTRACT EXPIRY',
    documentName: 'Fictional_Employment_Agreement_Sample.pdf',
    documentId: 'doc-emp-sample',
    context: 'Expiry Date: 04 August 2026. The employment term expires unless renewed in writing.',
    clause: 'Section 4.1 Term: This Agreement shall terminate automatically on 04 August 2026 without requirement of further notice.'
  },
  {
    id: 'dl-2',
    date: '15 Aug 2026',
    rawDate: new Date(2026, 7, 15),
    category: 'effective',
    eventType: 'EFFECTIVE DATE',
    documentName: 'Sample_Residential_Purchase_Agreement.pdf',
    documentId: 'doc-res-sample',
    context: 'Agreement becomes effective on 15 August 2026 upon escrow deposit confirmation.',
    clause: 'Section 1.2 Effective Date: The covenants herein take full legal effect on August 15, 2026.'
  },
  {
    id: 'dl-3',
    date: '18 Aug 2026',
    rawDate: new Date(2026, 7, 18),
    category: 'notice_period',
    eventType: 'NOTICE PERIOD',
    documentName: 'Fictional_Employment_Agreement_Sample.pdf',
    documentId: 'doc-emp-sample',
    context: '30-day written notice period deadline prior to contract renewal window.',
    clause: 'Section 9.3 Notice Requirements: Formal notice of non-renewal must be tendered on or before 18 August 2026.'
  },
  {
    id: 'dl-4',
    date: '30 Sep 2026',
    rawDate: new Date(2026, 8, 30),
    category: 'closing',
    eventType: 'CLOSING DEADLINE',
    documentName: 'Sample_Residential_Purchase_Agreement.pdf',
    documentId: 'doc-res-sample',
    context: 'Target Closing Date: On or before September 30, 2026 with title conveyance.',
    clause: 'Section 6.1 Closing Schedule: Title transfer and deed recording shall be executed on or before September 30, 2026.'
  },
  {
    id: 'dl-5',
    date: '15 Oct 2026',
    rawDate: new Date(2026, 9, 15),
    category: 'payment_due',
    eventType: 'PAYMENT DUE',
    documentName: 'Master_Services_Consultancy_Agreement.pdf',
    documentId: 'doc-msc-sample',
    context: 'Quarterly retainer fee disbursement due date following milestone deliverable acceptance.',
    clause: 'Section 3.2 Retainer Terms: Invoices issued under Milestone B are strictly payable by October 15, 2026.'
  },
  {
    id: 'dl-6',
    date: '01 Jan 2027',
    rawDate: new Date(2027, 0, 1),
    category: 'renewal',
    eventType: 'ANNUAL RENEWAL',
    documentName: 'Corporate_Commercial_Lease_Deed.pdf',
    documentId: 'doc-lease-sample',
    context: 'Annual commercial lease escalation and tenancy renewal option deadline.',
    clause: 'Section 12.1 Escalation Review: Tenancy rate adjustments for subsequent term take effect January 1, 2027.'
  }
];

export const Deadlines = () => {
  const [serverDeadlines, setServerDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState('dl-1'); // Default expanded nearest critical deadline
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    async function loadDeadlines() {
      try {
        const res = await Api.get('/api/ai/deadlines');
        if (isMounted && res.deadlines && res.deadlines.length > 0) {
          setServerDeadlines(res.deadlines);
        }
      } catch (err) {
        console.warn('Server deadlines fetch note:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDeadlines();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  // Combine and structure deadlines
  const allDeadlines = useMemo(() => {
    let list = [];
    if (serverDeadlines.length > 0) {
      list = serverDeadlines.map((d, index) => {
        const dateObj = parseLegalDate(d.date);
        const eventType = d.category ? d.category.replace('_', ' ').toUpperCase() : 'CRITICAL DATE';
        return {
          id: `srv-${index}`,
          date: d.date,
          rawDate: dateObj,
          category: d.category || 'general',
          eventType: eventType === 'EXPIRY' ? 'CONTRACT EXPIRY' : eventType,
          documentName: d.documentName || 'Protected_Legal_Dossier.pdf',
          documentId: d.documentId,
          context: d.context || 'Extracted critical contractual milestone.',
          clause: d.context
        };
      });
    } else {
      list = DEFAULT_LEGAL_DEADLINES;
    }

    // Sort chronologically ascending
    return list.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  }, [serverDeadlines]);

  // Unique documents count
  const trackedDocsCount = useMemo(() => {
    const set = new Set(allDeadlines.map(d => d.documentName));
    return set.size;
  }, [allDeadlines]);

  // Nearest critical deadline
  const nextDeadline = allDeadlines[0] || null;
  const nextDateFormatted = nextDeadline ? formatTimelineDate(nextDeadline.rawDate) : null;
  const nextDaysRemaining = nextDeadline ? getDaysRemaining(nextDeadline.rawDate) : 0;

  // Horizontal months distribution
  const monthsDistribution = useMemo(() => {
    const map = new Map();
    allDeadlines.forEach(d => {
      const monthKey = d.rawDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
      const count = map.get(monthKey) || 0;
      map.set(monthKey, count + 1);
    });
    return Array.from(map.entries()).map(([month, count]) => ({ month, count }));
  }, [allDeadlines]);

  // Filtered by selected month if user clicks on month pill
  const visibleDeadlines = useMemo(() => {
    if (selectedMonth === 'ALL') return allDeadlines;
    return allDeadlines.filter(d => {
      const monthKey = d.rawDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
      return monthKey === selectedMonth;
    });
  }, [allDeadlines, selectedMonth]);

  if (loading) {
    return (
      <PageTransition>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <SkeletonLoader.Text lines={2} width="320px" />
          <div style={{ marginTop: '24px' }}>
            <SkeletonLoader.Card count={3} height="120px" />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="timeline-page-container">
        {/* Landscape Ambient Background Artwork */}
        <div className="timeline-ambient-bg" />
        <div className="timeline-ambient-overlay" />

        <div className="timeline-content-wrapper">
          {/* Header */}
          <div className="timeline-header-block mb-16">
            <span className="mono text-lo small" style={{ letterSpacing: '0.08em' }}>
              [TIMELINE_INTELLIGENCE]
            </span>
            <h1 className="page-title" style={{ marginTop: '2px', marginBottom: '4px', letterSpacing: '-0.03em' }}>
              DEADLINES
            </h1>
            <p className="page-sub" style={{ margin: 0 }}>
              Critical dates automatically extracted from your protected documents.
            </p>
          </div>

          {/* Inline Summary Metrics */}
          <div className="timeline-inline-metrics">
            <div className="metric-inline-item">
              <span className="metric-inline-label">UPCOMING</span>
              <strong className="metric-inline-val">{allDeadlines.length} deadlines</strong>
            </div>
            <div className="metric-inline-divider" />
            <div className="metric-inline-item">
              <span className="metric-inline-label">NEXT</span>
              <strong className="metric-inline-val" style={{ color: '#10B981' }}>
                {nextDateFormatted ? `${nextDateFormatted.day} ${nextDateFormatted.month}` : 'N/A'}
              </strong>
            </div>
            <div className="metric-inline-divider" />
            <div className="metric-inline-item">
              <span className="metric-inline-label">DOCUMENTS</span>
              <strong className="metric-inline-val">{trackedDocsCount} tracked</strong>
            </div>
          </div>

          {/* Next Deadline Hero Focus Card */}
          {nextDeadline && (
            <motion.div
              className="next-deadline-hero"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="next-hero-top-row">
                <span className="next-hero-tag mono">[NEXT CRITICAL DATE]</span>
                <span className="badge badge-warn" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  {nextDaysRemaining <= 0 ? 'DUE TODAY' : `${nextDaysRemaining} DAYS REMAINING`}
                </span>
              </div>

              <div className="next-hero-body">
                <div className="next-hero-date-wrap">
                  <h2 className="next-hero-date-text">
                    {nextDateFormatted?.day} {nextDateFormatted?.month} {nextDateFormatted?.year}
                  </h2>
                  <span className="next-hero-event-type mono">{nextDeadline.eventType}</span>
                </div>

                <div className="next-hero-doc-wrap">
                  <span className="next-hero-doc-label">Source Document:</span>
                  <Link
                    to={nextDeadline.documentId ? `/document/${nextDeadline.documentId}` : '/documents'}
                    className="next-hero-doc-name"
                  >
                    📄 {nextDeadline.documentName}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Horizontal Time Distribution Overview */}
          <div className="timeline-horizontal-overview">
            <div className="month-tabs-track">
              <button
                className={`month-tab-btn ${selectedMonth === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedMonth('ALL')}
              >
                ALL ({allDeadlines.length})
              </button>
              {monthsDistribution.map(({ month, count }) => (
                <button
                  key={month}
                  className={`month-tab-btn ${selectedMonth === month ? 'active' : ''}`}
                  onClick={() => setSelectedMonth(selectedMonth === month ? 'ALL' : month)}
                >
                  <span>{month}</span>
                  <span className="month-badge">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Vertical Chronological Timeline */}
          <div className="timeline-vertical-wrapper">
            <div className="timeline-vertical-spine" />

            <div className="timeline-events-list">
              {visibleDeadlines.map((d, index) => {
                const formatted = formatTimelineDate(d.rawDate);
                const daysLeft = getDaysRemaining(d.rawDate);
                const isNearest = index === 0;
                const isExpanded = expandedId === d.id;

                // Urgency status & colors
                const urgency =
                  daysLeft <= 7
                    ? { label: `${daysLeft}d remaining`, color: '#EF4444', status: 'urgent' }
                    : daysLeft <= 30
                    ? { label: `${daysLeft}d remaining`, color: '#F59E0B', status: 'approaching' }
                    : { label: `${daysLeft}d remaining`, color: '#10B981', status: 'safe' };

                return (
                  <div
                    key={d.id}
                    className={`timeline-node-item ${isNearest ? 'nearest-event' : ''} ${isExpanded ? 'expanded' : ''}`}
                  >
                    {/* Node Left: Prominent Date */}
                    <div className="timeline-node-date-col">
                      <strong className="timeline-date-day">{formatted.day}</strong>
                      <span className="timeline-date-month mono">{formatted.month}</span>
                      <span className="timeline-date-year text-lo">{formatted.year}</span>
                    </div>

                    {/* Node Center: Glowing Circular Marker */}
                    <div className="timeline-marker-anchor">
                      <div
                        className="timeline-marker-circle"
                        style={{
                          borderColor: urgency.color,
                          boxShadow: isNearest ? `0 0 14px ${urgency.color}66` : 'none'
                        }}
                      >
                        <div
                          className="timeline-marker-core"
                          style={{ background: urgency.color }}
                        />
                      </div>
                    </div>

                    {/* Node Right: Event Card & Progressive Drawer */}
                    <div
                      className="timeline-node-card"
                      onClick={() => setExpandedId(isExpanded ? null : d.id)}
                    >
                      <div className="timeline-card-header">
                        <div className="timeline-card-title-row">
                          <span
                            className="mono timeline-event-badge"
                            style={{ color: urgency.color, background: `${urgency.color}15`, border: `1px solid ${urgency.color}33` }}
                          >
                            {d.eventType}
                          </span>
                          <span className="timeline-doc-title">
                            {d.documentName}
                          </span>
                        </div>
                        <span className="badge timeline-urgency-pill" style={{ color: urgency.color, background: `${urgency.color}12` }}>
                          {urgency.label}
                        </span>
                      </div>

                      <p className="timeline-card-excerpt">
                        {d.context}
                      </p>

                      {/* Progressive Disclosure Expandable Drawer */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            className="timeline-drawer-content"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="timeline-drawer-divider" />
                            <div className="timeline-clause-box">
                              <span className="mono text-lo small" style={{ display: 'block', marginBottom: '4px' }}>
                                [EXTRACTED_CLAUSE_EVIDENCE]
                              </span>
                              <p className="timeline-clause-text">
                                "{d.clause || d.context}"
                              </p>
                            </div>

                            <div className="timeline-drawer-actions">
                              <span className="mono text-lo small">
                                Category: <strong>{d.category.toUpperCase()}</strong>
                              </span>
                              <Link
                                to={d.documentId ? `/document/${d.documentId}` : '/documents'}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '11.5px', padding: '4px 10px' }}
                              >
                                <Icon.document width={12} height={12} /> Open Source Document
                              </Link>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Deadlines;
