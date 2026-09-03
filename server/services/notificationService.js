const { v4: uuidv4 } = require('uuid');
const db = require('../db');

/**
 * Supported Notification Types
 */
const NOTIFICATION_TYPES = {
  ACTION_ASSIGNED: 'ACTION_ASSIGNED',
  DUE_SOON: 'DUE_SOON',
  ACTION_OVERDUE: 'ACTION_OVERDUE',
  HIGH_PRIORITY_ACTION: 'HIGH_PRIORITY_ACTION',
  ACTION_RESOLVED: 'ACTION_RESOLVED',
  ACTION_REOPENED: 'ACTION_REOPENED',
  ACTION_ESCALATED: 'ACTION_ESCALATED'
};

/**
 * Deterministic Severity Levels
 */
const SEVERITIES = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

/**
 * Helper to format ISO date to readable YYYY-MM-DD
 */
function formatDateString(val) {
  if (!val) return '';
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toISOString().split('T')[0];
}

/**
 * Atomically create a notification with database-level deduplication
 */
async function createNotification({
  userId,
  documentId,
  actionId,
  type,
  severity,
  title,
  message,
  metadata = {},
  deduplicationKey
}, client = null) {
  if (!userId || !type || !severity || !title || !message || !deduplicationKey) {
    throw new Error('Missing required notification fields');
  }

  const dbClient = client || db;
  const id = uuidv4();
  const query = `
    INSERT INTO contract_notifications (
      id, user_id, document_id, action_id, type, severity,
      title, message, metadata, deduplication_key, is_read, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, FALSE, CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id, deduplication_key) DO NOTHING
    RETURNING *;
  `;

  const { rows } = await dbClient.query(query, [
    id,
    userId,
    documentId || null,
    actionId || null,
    type,
    severity,
    title,
    message,
    JSON.stringify(metadata),
    deduplicationKey
  ]);

  return rows[0] || null;
}

/**
 * Deterministic Deadline Intelligence & Evaluation Engine
 * Evaluates active actions for a user to detect OVERDUE and DUE_SOON conditions.
 */
async function evaluateDeadlineNotifications(userId) {
  if (!userId) return { evaluated: false, createdCount: 0 };

  const now = new Date();
  const upcomingWindow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days in UTC

  // Find active workflow actions owned by the user or on user's documents if unassigned
  const { rows: actions } = await db.query(
    `SELECT a.id, a.document_id, a.title, a.priority_score, a.status, a.due_date,
            a.owner_id, d.user_id AS doc_owner_id
     FROM contract_actions a
     JOIN documents d ON d.id = a.document_id
     WHERE a.status NOT IN ('RESOLVED', 'DISMISSED')
       AND a.due_date IS NOT NULL
       AND (a.owner_id = $1 OR (a.owner_id IS NULL AND d.user_id = $1))`,
    [userId]
  );

  let createdCount = 0;

  for (const action of actions) {
    const dueDate = new Date(action.due_date);
    if (isNaN(dueDate.getTime())) continue;

    const dueDateStr = formatDateString(dueDate);
    const isOverdue = dueDate < now;
    const isDueSoon = !isOverdue && dueDate <= upcomingWindow;

    if (isOverdue) {
      const severity = Number(action.priority_score) >= 80 ? SEVERITIES.CRITICAL : SEVERITIES.HIGH;
      const dedupKey = `overdue:${action.id}:${dueDateStr}`;

      const created = await createNotification({
        userId,
        documentId: action.document_id,
        actionId: action.id,
        type: NOTIFICATION_TYPES.ACTION_OVERDUE,
        severity,
        title: 'Action Overdue',
        message: `Action "${action.title}" is overdue since ${dueDateStr}.`,
        metadata: {
          actionId: action.id,
          documentId: action.document_id,
          dueDate: dueDateStr,
          priorityScore: action.priority_score
        },
        deduplicationKey: dedupKey
      });

      if (created) createdCount++;
    } else if (isDueSoon) {
      const severity = Number(action.priority_score) >= 80 ? SEVERITIES.HIGH : SEVERITIES.MEDIUM;
      const dedupKey = `due_soon:${action.id}:${dueDateStr}`;

      const created = await createNotification({
        userId,
        documentId: action.document_id,
        actionId: action.id,
        type: NOTIFICATION_TYPES.DUE_SOON,
        severity,
        title: 'Action Due Soon',
        message: `Action "${action.title}" is due on ${dueDateStr}.`,
        metadata: {
          actionId: action.id,
          documentId: action.document_id,
          dueDate: dueDateStr,
          priorityScore: action.priority_score
        },
        deduplicationKey: dedupKey
      });

      if (created) createdCount++;
    }
  }

  return { evaluated: true, totalActionsChecked: actions.length, createdCount };
}

/**
 * Triggered on action owner assignment.
 * Deduplication key uses activityId / assignment timestamp to allow valid re-assignments.
 */
async function notifyActionAssigned(action, newOwnerId, assignedByUserId, activityId = null, client = null) {
  if (!newOwnerId || newOwnerId === assignedByUserId) return null;

  const dedupKey = activityId 
    ? `assigned:${action.id}:${newOwnerId}:${activityId}`
    : `assigned:${action.id}:${newOwnerId}:${Date.now()}`;

  return createNotification({
    userId: newOwnerId,
    documentId: action.document_id,
    actionId: action.id,
    type: NOTIFICATION_TYPES.ACTION_ASSIGNED,
    severity: SEVERITIES.MEDIUM,
    title: 'Action Assigned',
    message: `You have been assigned to action "${action.title}".`,
    metadata: {
      actionId: action.id,
      documentId: action.document_id,
      assignedBy: assignedByUserId,
      activityId: activityId || null
    },
    deduplicationKey: dedupKey
  }, client);
}

/**
 * Triggered when a high-priority action is created or synced
 * Threshold: priority_score >= 70
 */
async function notifyActionHighPriority(action, recipientUserId, client = null) {
  const score = Number(action.priority_score) || 0;
  if (score < 70 || !recipientUserId) return null;

  const severity = score >= 80 ? SEVERITIES.CRITICAL : SEVERITIES.HIGH;
  const dedupKey = `high_priority:${action.id}:${score}`;

  return createNotification({
    userId: recipientUserId,
    documentId: action.document_id,
    actionId: action.id,
    type: NOTIFICATION_TYPES.HIGH_PRIORITY_ACTION,
    severity,
    title: 'High Priority Action',
    message: `Action "${action.title}" requires immediate attention (Priority Score: ${score}).`,
    metadata: {
      actionId: action.id,
      documentId: action.document_id,
      priorityScore: score
    },
    deduplicationKey: dedupKey
  }, client);
}

/**
 * Triggered when an action is resolved
 */
async function notifyActionResolved(action, resolverUserId, client = null) {
  const recipientUserId = action.owner_id;
  if (!recipientUserId || recipientUserId === resolverUserId) return null;

  const resolvedTimeStr = action.resolved_at ? new Date(action.resolved_at).toISOString() : new Date().toISOString();
  const dedupKey = `resolved:${action.id}:${resolvedTimeStr.split('T')[0]}`;

  return createNotification({
    userId: recipientUserId,
    documentId: action.document_id,
    actionId: action.id,
    type: NOTIFICATION_TYPES.ACTION_RESOLVED,
    severity: SEVERITIES.LOW,
    title: 'Action Resolved',
    message: `Action "${action.title}" has been marked as resolved.`,
    metadata: {
      actionId: action.id,
      documentId: action.document_id,
      resolvedBy: resolverUserId
    },
    deduplicationKey: dedupKey
  }, client);
}

/**
 * Triggered when an action is reopened from RESOLVED/DISMISSED
 */
async function notifyActionReopened(action, actorUserId, client = null) {
  const recipientUserId = action.owner_id;
  if (!recipientUserId || recipientUserId === actorUserId) return null;

  const dedupKey = `reopened:${action.id}:${new Date().toISOString()}`;

  return createNotification({
    userId: recipientUserId,
    documentId: action.document_id,
    actionId: action.id,
    type: NOTIFICATION_TYPES.ACTION_REOPENED,
    severity: SEVERITIES.HIGH,
    title: 'Action Reopened',
    message: `Action "${action.title}" has been reopened for review.`,
    metadata: {
      actionId: action.id,
      documentId: action.document_id,
      reopenedBy: actorUserId
    },
    deduplicationKey: dedupKey
  }, client);
}

/**
 * Triggered when an action is escalated by the deterministic escalation engine.
 * Deduplication key incorporates activityId to guarantee single notification per escalation transition.
 */
async function notifyActionEscalated(action, rule, reason, recipientUserId, activityId = null, client = null) {
  if (!recipientUserId) return null;

  const dedupKey = activityId
    ? `escalated:${action.id}:${rule}:${activityId}`
    : `escalated:${action.id}:${rule}:${Date.now()}`;

  return createNotification({
    userId: recipientUserId,
    documentId: action.document_id,
    actionId: action.id,
    type: NOTIFICATION_TYPES.ACTION_ESCALATED,
    severity: SEVERITIES.CRITICAL,
    title: 'Action Escalated',
    message: `Action "${action.title}" has been escalated: ${reason}`,
    metadata: {
      actionId: action.id,
      documentId: action.document_id,
      rule,
      reason,
      priorityScore: action.priority_score,
      activityId: activityId || null
    },
    deduplicationKey: dedupKey
  }, client);
}

/**
 * Retrieve notifications for a user (Strictly read-only)
 */
async function getUserNotifications(userId, { unreadOnly = false, limit = 50, offset = 0 } = {}) {
  if (!userId) return { notifications: [], total: 0, unreadCount: 0 };

  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
  const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

  let whereClause = 'WHERE user_id = $1';
  const params = [userId];

  if (unreadOnly) {
    whereClause += ' AND is_read = FALSE';
  }

  const listQuery = `
    SELECT id, user_id, document_id, action_id, type, severity,
           title, message, metadata, deduplication_key,
           is_read AS "isRead", read_at AS "readAt", created_at AS "createdAt"
    FROM contract_notifications
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3;
  `;

  const countQuery = `
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE is_read = FALSE) AS "unreadCount"
    FROM contract_notifications
    WHERE user_id = $1;
  `;

  const [listRes, countRes] = await Promise.all([
    db.query(listQuery, [userId, parsedLimit, parsedOffset]),
    db.query(countQuery, [userId])
  ]);

  const formattedNotifications = listRes.rows.map((n) => ({
    id: n.id,
    userId: n.user_id,
    documentId: n.document_id,
    actionId: n.action_id,
    type: n.type,
    severity: n.severity,
    title: n.title,
    message: n.message,
    metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata) : (n.metadata || {}),
    isRead: Boolean(n.isRead),
    readAt: n.readAt,
    createdAt: n.createdAt
  }));

  return {
    notifications: formattedNotifications,
    total: parseInt(countRes.rows[0]?.total || '0', 10),
    unreadCount: parseInt(countRes.rows[0]?.unreadCount || '0', 10)
  };
}

/**
 * Retrieve unread count for a user (Strictly read-only)
 */
async function getUnreadCount(userId) {
  if (!userId) return 0;
  const { rows } = await db.query(
    `SELECT COUNT(*) AS count FROM contract_notifications WHERE user_id = $1 AND is_read = FALSE;`,
    [userId]
  );
  return parseInt(rows[0]?.count || '0', 10);
}

/**
 * Mark a single notification as read (Scoped strictly to authenticated user)
 */
async function markNotificationRead(notificationId, userId) {
  if (!notificationId || !userId) {
    return { errorStatus: 400, errorMessage: 'Notification ID is required' };
  }

  const { rows } = await db.query(
    `UPDATE contract_notifications
     SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, document_id, action_id, type, severity,
               title, message, metadata, is_read AS "isRead", read_at AS "readAt", created_at AS "createdAt";`,
    [notificationId, userId]
  );

  if (rows.length === 0) {
    // Check if notification exists under another user to return 403 vs 404
    const { rows: existsRows } = await db.query(
      `SELECT user_id FROM contract_notifications WHERE id = $1;`,
      [notificationId]
    );
    if (existsRows.length > 0) {
      return { errorStatus: 403, errorMessage: 'Unauthorized access to notification' };
    }
    return { errorStatus: 404, errorMessage: 'Notification not found' };
  }

  const n = rows[0];
  return {
    success: true,
    notification: {
      ...n,
      metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata) : (n.metadata || {})
    }
  };
}

/**
 * Mark all notifications as read for a user
 */
async function markAllNotificationsRead(userId) {
  if (!userId) {
    return { errorStatus: 400, errorMessage: 'User ID is required' };
  }

  const { rows } = await db.query(
    `UPDATE contract_notifications
     SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND is_read = FALSE
     RETURNING id;`,
    [userId]
  );

  return { success: true, updatedCount: rows.length };
}

module.exports = {
  NOTIFICATION_TYPES,
  SEVERITIES,
  createNotification,
  evaluateDeadlineNotifications,
  notifyActionAssigned,
  notifyActionHighPriority,
  notifyActionResolved,
  notifyActionReopened,
  notifyActionEscalated,
  getUserNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead
};
