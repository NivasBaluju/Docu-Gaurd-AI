import Api from './api';

export const PortfolioAnalyticsApi = {
  /**
   * Fetch portfolio summary metrics and weighted health score
   */
  async getPortfolioSummary() {
    return Api.get('/api/portfolio/summary');
  },

  /**
   * Fetch cross-contract executive attention queue
   * @param {Object} params - Query filters (page, limit, reason, priority, status, ownerId, documentId)
   */
  async getPortfolioAttentionQueue(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        query.append(k, v);
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return Api.get(`/api/portfolio/attention-queue${qs}`);
  },

  /**
   * Fetch ranked contracts by health / operational risk
   * @param {Object} params - Pagination params (page, limit)
   */
  async getPortfolioContractHealth(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return Api.get(`/api/portfolio/contracts/health${qs}`);
  },

  /**
   * Fetch cross-contract priority distribution across standardized bands
   */
  async getPortfolioPriorityDistribution() {
    return Api.get('/api/portfolio/priority-distribution');
  },

  /**
   * Fetch team workload distribution across all contracts
   */
  async getPortfolioWorkload() {
    return Api.get('/api/portfolio/workload');
  },

  /**
   * Fetch portfolio-wide deadline analytics
   */
  async getPortfolioDeadlines() {
    return Api.get('/api/portfolio/deadlines');
  },

  /**
   * Fetch portfolio escalation analytics
   */
  async getPortfolioEscalations() {
    return Api.get('/api/portfolio/escalations');
  }
};

export default PortfolioAnalyticsApi;
