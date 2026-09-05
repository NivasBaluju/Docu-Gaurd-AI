/**
 * Deciva — Integration Provider Registry
 * ---------------------------------------------------------------------------
 * Factory and registry mapping provider slugs to concrete Provider instances.
 */

const GenericRestDocumentProvider = require('./genericRestDocumentProvider');

const PROVIDERS = {
  generic_rest: new GenericRestDocumentProvider(),
  generic: new GenericRestDocumentProvider(),
  rest: new GenericRestDocumentProvider(),
  mock: new GenericRestDocumentProvider()
};

function getProvider(providerSlug) {
  const key = String(providerSlug || 'generic_rest').toLowerCase();
  const provider = PROVIDERS[key] || PROVIDERS.generic_rest;
  return provider;
}

function listSupportedProviders() {
  return [
    {
      slug: 'generic_rest',
      name: 'Generic Secure REST Document Source',
      type: 'DOCUMENT_SOURCE',
      auth_types: ['API_KEY', 'BEARER_TOKEN', 'BASIC'],
      features: ['FETCH_DOCUMENTS', 'LIST_DOCUMENTS', 'VERSION_DETECTION', 'OUTBOUND_WEBHOOK']
    },
    {
      slug: 'webhook',
      name: 'Inbound / Outbound Webhook Connector',
      type: 'WEBHOOK',
      auth_types: ['HMAC_SHA256', 'SECRET_HEADER'],
      features: ['EVENT_SUBSCRIPTION', 'OUTBOX_DELIVERY', 'REPLAY_PROTECTION']
    }
  ];
}

module.exports = {
  getProvider,
  listSupportedProviders
};
