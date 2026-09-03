/**
 * Portfolio Analytics Routes (Phase 7.8)
 * 
 * Provides authenticated, strictly read-only endpoints for cross-contract
 * portfolio intelligence, health scoring, attention queue, and workload oversight.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getPortfolioSummary,
  getPortfolioAttentionQueue,
  getPortfolioContractHealth,
  getPortfolioPriorityDistribution,
  getPortfolioWorkload,
  getPortfolioDeadlineAnalytics,
  getPortfolioEscalationAnalytics
} = require('../services/portfolioAnalyticsService');

/**
 * GET /api/portfolio/summary
 * Strictly read-only portfolio summary metrics and weighted health score.
 */
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const summary = await getPortfolioSummary(req.user);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portfolio/attention-queue
 * Strictly read-only unified cross-contract triage queue.
 */
router.get('/attention-queue', requireAuth, async (req, res, next) => {
  try {
    const queue = await getPortfolioAttentionQueue(req.user, req.query);
    res.json(queue);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portfolio/contracts/health
 * Strictly read-only ranked contracts by workflow health / risk.
 */
router.get('/contracts/health', requireAuth, async (req, res, next) => {
  try {
    const health = await getPortfolioContractHealth(req.user, req.query);
    res.json(health);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portfolio/priority-distribution
 * Strictly read-only priority band breakdown across all contracts.
 */
router.get('/priority-distribution', requireAuth, async (req, res, next) => {
  try {
    const distribution = await getPortfolioPriorityDistribution(req.user);
    res.json(distribution);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portfolio/workload
 * Strictly read-only team member workload distribution.
 */
router.get('/workload', requireAuth, async (req, res, next) => {
  try {
    const workload = await getPortfolioWorkload(req.user);
    res.json(workload);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portfolio/deadlines
 * Strictly read-only portfolio-wide deadline categorization.
 */
router.get('/deadlines', requireAuth, async (req, res, next) => {
  try {
    const deadlines = await getPortfolioDeadlineAnalytics(req.user);
    res.json(deadlines);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portfolio/escalations
 * Strictly read-only active escalation analytics by rule type.
 */
router.get('/escalations', requireAuth, async (req, res, next) => {
  try {
    const escalations = await getPortfolioEscalationAnalytics(req.user);
    res.json(escalations);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
