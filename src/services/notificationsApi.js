import Api from './api';

export const NotificationsApi = {
  /**
   * Fetch authenticated user's notifications
   * @param {{ unreadOnly?: boolean, limit?: number, offset?: number }} params
   */
  async getNotifications(params = {}) {
    const query = new URLSearchParams();
    if (params.unreadOnly) query.set('unreadOnly', 'true');
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    const qs = query.toString();
    return Api.get(`/api/notifications${qs ? `?${qs}` : ''}`);
  },

  /**
   * Fetch unread notification count
   */
  async getUnreadCount() {
    return Api.get('/api/notifications/unread-count');
  },

  /**
   * Explicitly trigger deadline intelligence evaluation
   */
  async evaluateNotifications() {
    return Api.post('/api/notifications/evaluate', {});
  },

  /**
   * Mark a single notification as read
   * @param {string} notificationId
   */
  async markAsRead(notificationId) {
    return Api.patch(`/api/notifications/${notificationId}/read`, {});
  },

  /**
   * Mark all unread notifications for authenticated user as read
   */
  async markAllAsRead() {
    return Api.patch('/api/notifications/read-all', {});
  }
};

export default NotificationsApi;
