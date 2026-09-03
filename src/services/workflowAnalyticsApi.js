import Api from './api';

export const WorkflowAnalyticsApi = {
  /**
   * Fetch aggregated deterministic workflow analytics for a document
   * @param {string} documentId
   */
  async getDocumentWorkflowAnalytics(documentId) {
    return Api.get(`/api/documents/${documentId}/workflow-analytics`);
  },

  /**
   * Fetch executive attention queue for urgent items in a document
   * @param {string} documentId
   */
  async getExecutiveAttentionQueue(documentId) {
    return Api.get(`/api/documents/${documentId}/attention-queue`);
  },

  /**
   * Explicitly trigger escalation evaluation for a document
   * @param {string} documentId
   */
  async evaluateEscalations(documentId) {
    return Api.post(`/api/documents/${documentId}/escalations/evaluate`, {});
  }
};

export default WorkflowAnalyticsApi;
