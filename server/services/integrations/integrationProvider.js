/**
 * DocuGuard AI — Abstract Integration Provider Interface
 * ---------------------------------------------------------------------------
 * Defines the canonical contract that all enterprise connectors must fulfill.
 * Future connectors (SharePoint, Salesforce, Box, Ironclad, Google Drive)
 * implement this interface without modifying core business logic.
 */

class IntegrationProvider {
  constructor(providerName) {
    this.providerName = providerName || 'generic';
  }

  /**
   * Validates configuration parameters before saving or activating.
   */
  async validateConfiguration(config = {}) {
    throw new Error(`validateConfiguration() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Executes a lightweight connectivity check against the external provider.
   */
  async testConnection(config = {}, credentials = {}) {
    throw new Error(`testConnection() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Lists available external documents matching criteria.
   */
  async listDocuments(config = {}, credentials = {}, params = {}) {
    throw new Error(`listDocuments() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Fetches full metadata and content for a single external document.
   */
  async fetchDocument(config = {}, credentials = {}, externalId) {
    throw new Error(`fetchDocument() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Retrieves the current version identifier of a remote document.
   */
  async fetchDocumentVersion(config = {}, credentials = {}, externalId) {
    throw new Error(`fetchDocumentVersion() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Dispatches an outbound event to the external provider.
   */
  async publishEvent(config = {}, credentials = {}, event = {}) {
    throw new Error(`publishEvent() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Performs deep diagnostic health check on the external connection.
   */
  async healthCheck(config = {}, credentials = {}) {
    throw new Error(`healthCheck() must be implemented by ${this.constructor.name}`);
  }
}

module.exports = IntegrationProvider;
