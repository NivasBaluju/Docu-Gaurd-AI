import Api from './api';

export const IntegrationApi = {
  getOverview: async () => {
    return Api.get('/api/integrations/overview');
  },
  listProviders: async () => {
    return Api.get('/api/integrations/providers');
  },
  listIntegrations: async () => {
    return Api.get('/api/integrations');
  },
  getIntegration: async (integrationId) => {
    return Api.get(`/api/integrations/${integrationId}`);
  },
  createIntegration: async (data) => {
    return Api.post('/api/integrations', data);
  },
  updateIntegration: async (integrationId, data) => {
    return Api.patch(`/api/integrations/${integrationId}`, data);
  },
  activateIntegration: async (integrationId) => {
    return Api.post(`/api/integrations/${integrationId}/activate`);
  },
  pauseIntegration: async (integrationId) => {
    return Api.post(`/api/integrations/${integrationId}/pause`);
  },
  disableIntegration: async (integrationId) => {
    return Api.post(`/api/integrations/${integrationId}/disable`);
  },
  deleteIntegration: async (integrationId) => {
    return Api.delete(`/api/integrations/${integrationId}`);
  },
  testConnection: async (integrationId) => {
    return Api.post(`/api/integrations/${integrationId}/test`);
  },
  getHealth: async (integrationId) => {
    return Api.get(`/api/integrations/${integrationId}/health`);
  },
  triggerSync: async (integrationId, options = {}) => {
    return Api.post(`/api/integrations/${integrationId}/sync`, options);
  },
  listSyncRuns: async (integrationId) => {
    return Api.get(`/api/integrations/${integrationId}/sync-runs`);
  },
  listMappings: async (integrationId) => {
    return Api.get(`/api/integrations/${integrationId}/mappings`);
  },
  listEvents: async (integrationId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return Api.get(`/api/integrations/${integrationId}/events${qs ? '?' + qs : ''}`);
  },
  retryEvents: async (integrationId, eventId = null) => {
    return Api.post(`/api/integrations/${integrationId}/events/retry`, { eventId });
  }
};
