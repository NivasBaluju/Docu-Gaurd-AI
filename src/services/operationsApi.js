/**
 * src/services/operationsApi.js
 * API client for Phase 15 Enterprise Operations, Backups, Recovery, Portability,
 * Lifecycle, Retention, Legal Holds, and System Integrity.
 */

const BASE_URL = '/api/admin';

function getAuthHeaders() {
  const token = localStorage.getItem('docuguard_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export const operationsApi = {
  async getOperationalMetrics(tenantId = null) {
    const q = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    const res = await fetch(`${BASE_URL}/operations/metrics${q}`, { credentials: 'include', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch operational metrics');
    return res.json();
  },

  async getDatabaseIntegrity() {
    const res = await fetch(`${BASE_URL}/database/integrity`, { credentials: 'include', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to check database integrity');
    return res.json();
  },

  async getAuditIntegrity() {
    const res = await fetch(`${BASE_URL}/audit/integrity`, { credentials: 'include', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to verify audit integrity');
    return res.json();
  },

  async listBackups(tenantId = null) {
    const q = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    const res = await fetch(`${BASE_URL}/backups${q}`, { credentials: 'include', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to list backups');
    return res.json();
  },

  async createBackup(payload) {
    const res = await fetch(`${BASE_URL}/backups`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create backup');
    return res.json();
  },

  async verifyBackup(backupId) {
    const res = await fetch(`${BASE_URL}/backups/${backupId}/verify`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to verify backup');
    return res.json();
  },

  async verifyExternalBackup(backupId) {
    const res = await fetch(`${BASE_URL}/backups/${backupId}/verify-external`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to verify external backup vault');
    return res.json();
  },

  async restoreBackup(backupId, payload = {}) {
    const res = await fetch(`${BASE_URL}/backups/${backupId}/restore`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to restore backup');
    return res.json();
  },

  async restoreFromExternalBackup(backupId, payload = {}) {
    const res = await fetch(`${BASE_URL}/backups/${backupId}/restore-external`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to restore from external backup vault');
    return res.json();
  },

  async pruneBackups(payload = {}) {
    const res = await fetch(`${BASE_URL}/backups/prune`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to prune expired backups');
    return res.json();
  },

  async getRecoveryMetrics() {
    const res = await fetch(`${BASE_URL}/backups/metrics`, { credentials: 'include', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch recovery metrics');
    return res.json();
  },

  async exportData(tenantId) {
    const res = await fetch(`${BASE_URL}/export`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tenant_id: tenantId })
    });
    if (!res.ok) throw new Error('Failed to export tenant data');
    return res.json();
  },

  async importData(payload) {
    const res = await fetch(`${BASE_URL}/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to import tenant data');
    return res.json();
  },

  async getTenantLifecycle(tenantId) {
    const res = await fetch(`${BASE_URL}/lifecycle/${tenantId}`, { credentials: 'include', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch tenant lifecycle');
    return res.json();
  },

  async updateTenantLifecycle(tenantId, action, payload = {}) {
    const res = await fetch(`${BASE_URL}/lifecycle/${tenantId}/${action}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to ${action} tenant`);
    }
    return res.json();
  },

  async listLegalHolds(tenantId) {
    const res = await fetch(`${BASE_URL}/legal-holds?tenant_id=${encodeURIComponent(tenantId)}`, {
      credentials: 'include',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to list legal holds');
    return res.json();
  },

  async createLegalHold(payload) {
    const res = await fetch(`${BASE_URL}/legal-holds`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create legal hold');
    return res.json();
  },

  async releaseLegalHold(holdId, payload) {
    const res = await fetch(`${BASE_URL}/legal-holds/${holdId}/release`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to release legal hold');
    return res.json();
  },

  async previewRetention(payload) {
    const res = await fetch(`${BASE_URL}/retention/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to preview retention');
    return res.json();
  },

  async applyRetention(payload) {
    const res = await fetch(`${BASE_URL}/retention/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to apply retention');
    return res.json();
  },

  async invokeBreakGlass(payload) {
    const res = await fetch(`${BASE_URL}/break-glass`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Break-glass emergency authorization failed');
    return res.json();
  },

  async listJobs(params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/jobs${q ? '?' + q : ''}`, { credentials: 'include', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to list background jobs');
    return res.json();
  },

  async retryJob(jobId) {
    const res = await fetch(`${BASE_URL}/jobs/${jobId}/retry`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to retry job');
    return res.json();
  },

  async getConfigFingerprint() {
    const res = await fetch(`${BASE_URL}/config/fingerprint`, { credentials: 'include', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to get config fingerprint');
    return res.json();
  },

  async getDemoStatus() {
    const res = await fetch(`${BASE_URL}/demo/status`, { credentials: 'include', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch demo environment status');
    return res.json();
  },

  async seedDemoDataset() {
    const res = await fetch(`${BASE_URL}/demo/seed`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to seed demo environment');
    return res.json();
  },

  async purgeDemoDataset() {
    const res = await fetch(`${BASE_URL}/demo/purge`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to purge demo dataset');
    return res.json();
  }
};
