/**
 * Deciva — Generic Secure REST Document Provider
 * ---------------------------------------------------------------------------
 * Concrete implementation of IntegrationProvider for REST-based document systems,
 * virtual file repositories, and webhook-driven cloud content endpoints.
 */

const IntegrationProvider = require('./integrationProvider');
const IntegrationNormalizationService = require('../integrationNormalizationService');

class GenericRestDocumentProvider extends IntegrationProvider {
  constructor() {
    super('generic_rest');
  }

  /**
   * Validates configuration parameters.
   */
  async validateConfiguration(config = {}) {
    const errors = [];
    if (!config.endpoint_url && !config.mock) {
      errors.push('endpoint_url is required when not in mock mode');
    }
    if (config.endpoint_url && !config.endpoint_url.startsWith('https://') && !config.endpoint_url.startsWith('http://localhost') && !config.endpoint_url.startsWith('http://127.0.0.1')) {
      errors.push('endpoint_url must use HTTPS for production security');
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Tests connectivity to the remote document system.
   */
  async testConnection(config = {}, credentials = {}) {
    if (config.mock || !config.endpoint_url) {
      return {
        reachable: true,
        authenticated: Boolean(credentials?.apiKey || credentials?.token || config.mock),
        latency_ms: 12,
        server_info: 'Deciva Generic REST Connector v1.0 (Simulation)'
      };
    }

    const start = Date.now();
    try {
      const headers = this._buildAuthHeaders(credentials);
      const res = await fetch(`${config.endpoint_url.replace(/\/$/, '')}/health`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(config.timeout_ms || 5000)
      });
      const latency = Date.now() - start;
      return {
        reachable: res.status < 500,
        authenticated: res.status !== 401 && res.status !== 403,
        status_code: res.status,
        latency_ms: latency
      };
    } catch (err) {
      return {
        reachable: false,
        authenticated: false,
        error: err.message,
        latency_ms: Date.now() - start
      };
    }
  }

  /**
   * Lists available external documents.
   */
  async listDocuments(config = {}, credentials = {}, params = {}) {
    if (config.mock || !config.endpoint_url) {
      const mockDocs = config.mock_documents || [
        {
          id: 'ext-doc-101',
          name: 'Master Services Agreement - Vendor Corp',
          version: '1',
          content: 'This Master Services Agreement is entered into between Vendor Corp and Client...',
          effective_date: '2026-01-01T00:00:00Z'
        },
        {
          id: 'ext-doc-102',
          name: 'Software Licensing Agreement - Global Soft',
          version: '2',
          content: 'This Software Licensing Agreement grants non-exclusive license...',
          effective_date: '2026-03-15T00:00:00Z'
        }
      ];

      return {
        documents: mockDocs.map(d => {
          try {
            return IntegrationNormalizationService.normalizeDocument(this.providerName, d);
          } catch {
            return d;
          }
        }),
        total: mockDocs.length,
        has_more: false
      };
    }

    const headers = this._buildAuthHeaders(credentials);
    const qs = new URLSearchParams(params).toString();
    const url = `${config.endpoint_url.replace(/\/$/, '')}/documents${qs ? '?' + qs : ''}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      throw new Error(`Failed to list documents from provider (HTTP ${res.status})`);
    }

    const data = await res.json();
    const rawList = Array.isArray(data) ? data : (data.documents || data.items || []);
    return {
      documents: rawList.map(item => IntegrationNormalizationService.normalizeDocument(this.providerName, item)),
      total: data.total || rawList.length,
      has_more: Boolean(data.has_more)
    };
  }

  /**
   * Fetches a specific document by external ID.
   */
  async fetchDocument(config = {}, credentials = {}, externalId) {
    if (config.mock || !config.endpoint_url) {
      const mockDoc = (config.mock_documents || []).find(d => String(d.id || d.external_object_id) === String(externalId)) || {
        id: externalId,
        name: `External Document ${externalId}`,
        version: '1',
        content: `Standard legal contract content for external document ${externalId} with liability capped at $1,000,000.`,
        effective_date: new Date().toISOString()
      };
      return IntegrationNormalizationService.normalizeDocument(this.providerName, mockDoc);
    }

    const headers = this._buildAuthHeaders(credentials);
    const url = `${config.endpoint_url.replace(/\/$/, '')}/documents/${encodeURIComponent(externalId)}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      throw new Error(`External document ${externalId} fetch failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    return IntegrationNormalizationService.normalizeDocument(this.providerName, data);
  }

  /**
   * Fetches version number for external document.
   */
  async fetchDocumentVersion(config = {}, credentials = {}, externalId) {
    const doc = await this.fetchDocument(config, credentials, externalId);
    return doc.external_version || '1';
  }

  /**
   * Dispatches outbound event to provider webhook endpoint.
   */
  async publishEvent(config = {}, credentials = {}, event = {}) {
    if (config.mock || !config.outbound_webhook_url) {
      return {
        delivered: true,
        delivery_id: `deliv-mock-${Date.now()}`,
        status: 200,
        timestamp: new Date().toISOString()
      };
    }

    const headers = {
      'Content-Type': 'application/json',
      ...this._buildAuthHeaders(credentials)
    };

    const res = await fetch(config.outbound_webhook_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      throw new Error(`Outbound event delivery failed (HTTP ${res.status})`);
    }

    return {
      delivered: true,
      status: res.status,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Diagnostics health check.
   */
  async healthCheck(config = {}, credentials = {}) {
    return this.testConnection(config, credentials);
  }

  _buildAuthHeaders(credentials = {}) {
    const headers = {};
    if (credentials.apiKey) {
      headers['X-API-Key'] = credentials.apiKey;
    } else if (credentials.token) {
      headers['Authorization'] = `Bearer ${credentials.token}`;
    }
    return headers;
  }
}

module.exports = GenericRestDocumentProvider;
