const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

/**
 * GET /api/notifications
 * Strictly read-only retrieval of the authenticated user's notifications.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === true;
    const limit = req.query.limit;
    const offset = req.query.offset;

    const data = await notificationService.getUserNotifications(req.user.id, {
      unreadOnly,
      limit,
      offset
    });

    return res.json({
      success: true,
      ...data
    });
  } catch (err) {
    console.error('getUserNotifications error:', err);
    return res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Strictly read-only count of unread notifications for the authenticated user.
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    return res.json({
      success: true,
      unreadCount
    });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return res.status(500).json({ error: 'Failed to retrieve unread count' });
  }
});

/**
 * POST /api/notifications/evaluate
 * Explicit deadline intelligence evaluation endpoint for the authenticated user.
 */
router.post('/evaluate', requireAuth, async (req, res) => {
  try {
    const result = await notificationService.evaluateDeadlineNotifications(req.user.id);
    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('evaluateDeadlineNotifications error:', err);
    return res.status(500).json({ error: 'Failed to evaluate deadline notifications' });
  }
});

/**
 * PATCH /api/notifications/:notificationId/read
 * Mark a single notification as read (scoped strictly to authenticated user).
 */
router.patch('/:notificationId/read', requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const result = await notificationService.markNotificationRead(notificationId, req.user.id);

    if (result.errorStatus) {
      return res.status(result.errorStatus).json({ error: result.errorMessage });
    }

    return res.json(result);
  } catch (err) {
    console.error('markNotificationRead error:', err);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all unread notifications for the authenticated user as read.
 */
router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    const result = await notificationService.markAllNotificationsRead(req.user.id);

    if (result.errorStatus) {
      return res.status(result.errorStatus).json({ error: result.errorMessage });
    }

    return res.json(result);
  } catch (err) {
    console.error('markAllNotificationsRead error:', err);
    return res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

module.exports = router;
