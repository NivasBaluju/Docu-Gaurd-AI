import Api from './api';

export const ActionsApi = {
  /**
   * Fetch all workflow actions for a specific document
   * @param {string} documentId
   */
  async getDocumentActions(documentId) {
    return Api.get(`/api/documents/${documentId}/actions`);
  },

  /**
   * Fetch a single workflow action by ID
   * @param {string} actionId
   */
  async getAction(actionId) {
    return Api.get(`/api/actions/${actionId}`);
  },

  /**
   * Fetch full decision ledger and audit activity history for an action
   * @param {string} actionId
   */
  async getActionHistory(actionId) {
    return Api.get(`/api/actions/${actionId}/history`);
  },

  /**
   * Synchronize actions from latest Phase 6.4 contract intelligence snapshot
   * @param {string} documentId
   */
  async syncDocumentActions(documentId) {
    return Api.post(`/api/documents/${documentId}/actions/sync`, {});
  },

  /**
   * Transition action status through strict state machine
   * @param {string} actionId
   * @param {{ status: string, resolutionNotes?: string, reason?: string }} payload
   */
  async updateActionStatus(actionId, payload) {
    return Api.patch(`/api/actions/${actionId}/status`, payload);
  },

  /**
   * Record human decision into append-only decision ledger
   * @param {string} actionId
   * @param {{ decision: string, reason: string }} payload
   */
  async recordActionDecision(actionId, payload) {
    return Api.post(`/api/actions/${actionId}/decision`, payload);
  },

  /**
   * Assign or unassign owner for an action
   * @param {string} actionId
   * @param {{ ownerId: string | null }} payload
   */
  async updateActionOwner(actionId, payload) {
    return Api.patch(`/api/actions/${actionId}/owner`, payload);
  },

  /**
   * Set, update, or clear due date for an action
   * @param {string} actionId
   * @param {{ dueDate: string | null }} payload
   */
  async updateActionDueDate(actionId, payload) {
    return Api.patch(`/api/actions/${actionId}/due-date`, payload);
  },

  /**
   * Fetch threaded discussion comments for an action
   * @param {string} actionId
   */
  async getActionComments(actionId) {
    return Api.get(`/api/actions/${actionId}/comments`);
  },

  /**
   * Create a new comment or reply for an action
   * @param {string} actionId
   * @param {{ body: string, parentCommentId?: string, contextReferences?: object }} payload
   */
  async createActionComment(actionId, payload) {
    return Api.post(`/api/actions/${actionId}/comments`, payload);
  },

  /**
   * Edit an existing comment
   * @param {string} actionId
   * @param {string} commentId
   * @param {{ body: string }} payload
   */
  async editActionComment(actionId, commentId, payload) {
    return Api.patch(`/api/actions/${actionId}/comments/${commentId}`, payload);
  },

  /**
   * Soft-delete a comment
   * @param {string} actionId
   * @param {string} commentId
   */
  async deleteActionComment(actionId, commentId) {
    return Api.delete(`/api/actions/${actionId}/comments/${commentId}`);
  }
};

export default ActionsApi;
