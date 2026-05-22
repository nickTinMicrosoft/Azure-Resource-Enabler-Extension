/**
 * Azure Resource Enabler Extension
 * Discovers and re-enables Azure resources disabled by nightly policy.
 */

// ─── Resource Handlers ─────────────────────────────────────────────────────────
// Each handler defines how to detect and fix a specific resource type's disabled state.

const RESOURCE_HANDLERS = {
  'Microsoft.Storage/storageAccounts': {
    label: 'Storage Accounts',
    icon: '🗄️',
    apiVersion: '2023-05-01',
    checks: [
      {
        id: 'sharedKeyAccess',
        description: 'Shared key access disabled',
        isDisabled: (resource) => resource.properties?.allowSharedKeyAccess === false,
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2023-05-01`,
          body: { properties: { allowSharedKeyAccess: true } }
        })
      },
      {
        id: 'publicNetworkAccess',
        description: 'Public network access disabled',
        isDisabled: (resource) => resource.properties?.publicNetworkAccess === 'Disabled',
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2023-05-01`,
          body: { properties: { publicNetworkAccess: 'Enabled' } }
        })
      }
    ]
  },
  'Microsoft.EventHub/namespaces': {
    label: 'Event Hubs',
    icon: '⚡',
    apiVersion: '2024-01-01',
    checks: [
      {
        id: 'localAuth',
        description: 'Local authentication disabled',
        isDisabled: (resource) => resource.properties?.disableLocalAuth === true,
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2024-01-01`,
          body: { properties: { disableLocalAuth: false } }
        })
      }
    ]
  },
  'Microsoft.Sql/servers': {
    label: 'Azure SQL Servers',
    icon: '🛢️',
    apiVersion: '2023-08-01-preview',
    checks: [
      {
        id: 'publicNetworkAccess',
        description: 'Public network access disabled',
        isDisabled: (resource) => resource.properties?.publicNetworkAccess === 'Disabled',
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2023-08-01-preview`,
          body: { properties: { publicNetworkAccess: 'Enabled' } }
        })
      }
    ]
  },
  'Microsoft.DocumentDB/databaseAccounts': {
    label: 'Cosmos DB',
    icon: '🌐',
    apiVersion: '2024-05-15',
    checks: [
      {
        id: 'publicNetworkAccess',
        description: 'Public network access disabled',
        isDisabled: (resource) => resource.properties?.publicNetworkAccess === 'Disabled',
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2024-05-15`,
          body: { properties: { publicNetworkAccess: 'Enabled' } }
        })
      }
    ]
  },
  'Microsoft.KeyVault/vaults': {
    label: 'Key Vaults',
    icon: '🔑',
    apiVersion: '2023-07-01',
    checks: [
      {
        id: 'publicNetworkAccess',
        description: 'Public network access disabled',
        isDisabled: (resource) => resource.properties?.publicNetworkAccess === 'Disabled',
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2023-07-01`,
          body: { properties: { publicNetworkAccess: 'Enabled' } }
        })
      }
    ]
  },
  'Microsoft.ServiceBus/namespaces': {
    label: 'Service Bus',
    icon: '🚌',
    apiVersion: '2022-10-01-preview',
    checks: [
      {
        id: 'localAuth',
        description: 'Local authentication disabled',
        isDisabled: (resource) => resource.properties?.disableLocalAuth === true,
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2022-10-01-preview`,
          body: { properties: { disableLocalAuth: false } }
        })
      }
    ]
  },
  'Microsoft.MachineLearningServices/workspaces': {
    label: 'AI Foundry',
    icon: '🤖',
    apiVersion: '2024-04-01',
    checks: [
      {
        id: 'publicNetworkAccess',
        description: 'Public network access disabled',
        isDisabled: (resource) => resource.properties?.publicNetworkAccess === 'Disabled',
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2024-04-01`,
          body: { properties: { publicNetworkAccess: 'Enabled' } }
        })
      },
      {
        id: 'sharedKeyAccess',
        description: 'Shared key access disabled (v1LegacyMode)',
        isDisabled: (resource) => resource.properties?.v1LegacyMode === false && resource.properties?.allowKeyBasedAuthentication === false,
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2024-04-01`,
          body: { properties: { allowKeyBasedAuthentication: true } }
        })
      }
    ]
  }
};

// ─── Main Application Class ────────────────────────────────────────────────────

class AzureResourceEnabler {
  constructor() {
    // State
    this.accessToken = null;
    this.resourceTokens = {};
    this.subscriptions = [];
    this.disabledResources = []; // { resource, handler, check, handlerKey }
    this.selectedSubscription = null;
    this.debugMode = false;
    this.autoRefreshOnOpen = false;

    // Config
    this.baseUrl = 'https://management.azure.com';
    this.graphUrl = 'https://graph.microsoft.com';
    this.defaultClientId = 'b75cf7c4-8802-401f-8daa-226d5cb55f78';
    this.clientId = this.defaultClientId;
    this.tenantId = '17ab6ae4-62da-43e0-9140-dddeb0a17bf0';
    this.managementScopes = 'https://management.core.windows.net/user_impersonation offline_access openid profile';
    this.graphScopes = 'https://graph.microsoft.com/User.Read openid profile';
    this.refreshSafetyWindowMs = 3 * 60 * 1000;

    // DOM elements (set in init)
    this.elements = {};
  }

  // ─── Initialization ────────────────────────────────────────────────────────

  async init() {
    this.initElements();
    this.setupEventListeners();
    await this.loadSettings();
    this.log('Extension initialized. Click refresh to scan.');

    // Auto-login on load
    try {
      await this.authenticate();
      this.log('Authenticated. Loading subscriptions...');
      await this.loadSubscriptions();
      if (this.autoRefreshOnOpen && this.selectedSubscription) {
        this.log('Auto-scan enabled, scanning...');
        this.scanResources();
      }
    } catch (err) {
      this.debugLog(`Auto-login failed: ${err.message}`);
      this.log('Click refresh to sign in and scan.');
    }

    // Listen for background refresh pings
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === 'BACKGROUND_REFRESH_PING') {
        this.ensureFreshToken().catch(() => {});
      }
    });
  }

  initElements() {
    this.elements = {
      tenantInfo: document.getElementById('tenantInfo'),
      settingsToggleBtn: document.getElementById('settingsToggleBtn'),
      settingsPanel: document.getElementById('settingsPanel'),
      clientIdInput: document.getElementById('clientIdInput'),
      saveSettingsBtn: document.getElementById('saveSettingsBtn'),
      refreshBtn: document.getElementById('refreshBtn'),
      progressBar: document.getElementById('progressBar'),
      progressFill: document.getElementById('progressFill'),
      subscriptionSelect: document.getElementById('subscriptionSelect'),
      resourceList: document.getElementById('resourceList'),
      enableAllBtn: document.getElementById('enableAllBtn'),
      enableSelectedBtn: document.getElementById('enableSelectedBtn'),
      logArea: document.getElementById('logArea'),
      debugToggle: document.getElementById('debugToggle'),
      autoRefreshToggle: document.getElementById('autoRefreshToggle'),
      logoutBtn: document.getElementById('logoutBtn'),
    };
  }

  setupEventListeners() {
    const e = this.elements;
    e.refreshBtn.addEventListener('click', () => this.scanResources());
    e.settingsToggleBtn.addEventListener('click', () => this.toggleSettings());
    e.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
    e.subscriptionSelect.addEventListener('change', () => this.onSubscriptionChange());
    e.enableAllBtn.addEventListener('click', () => this.enableAll());
    e.enableSelectedBtn.addEventListener('click', () => this.enableSelected());
    e.logoutBtn.addEventListener('click', () => this.logout());
    e.debugToggle.addEventListener('change', (ev) => {
      this.debugMode = ev.target.checked;
      chrome.storage.local.set({ debugMode: this.debugMode });
    });
    e.autoRefreshToggle.addEventListener('change', (ev) => {
      this.autoRefreshOnOpen = ev.target.checked;
      chrome.storage.local.set({ autoRefreshOnOpen: this.autoRefreshOnOpen });
    });
  }

  // ─── Settings ──────────────────────────────────────────────────────────────

  async loadSettings() {
    const data = await chrome.storage.local.get(['clientId', 'tenantId', 'debugMode', 'autoRefreshOnOpen']);
    if (data.clientId) this.clientId = data.clientId;
    if (data.tenantId) this.tenantId = data.tenantId;
    if (data.debugMode) {
      this.debugMode = true;
      this.elements.debugToggle.checked = true;
    }
    if (data.autoRefreshOnOpen) {
      this.autoRefreshOnOpen = true;
      this.elements.autoRefreshToggle.checked = true;
    }
    this.elements.clientIdInput.value = this.clientId !== this.defaultClientId ? this.clientId : '';
  }

  toggleSettings() {
    this.elements.settingsPanel.classList.toggle('visible');
  }

  async saveSettings() {
    const newClientId = this.elements.clientIdInput.value.trim();
    if (newClientId && newClientId !== this.clientId) {
      this.clientId = newClientId;
      await chrome.storage.local.set({ clientId: this.clientId });
      this.log('Client ID saved. Please re-authenticate.');
      await this.clearAuth();
    } else if (!newClientId) {
      this.clientId = this.defaultClientId;
      await chrome.storage.local.set({ clientId: this.clientId });
      this.log('Reset to default Client ID.');
    }
    this.elements.settingsPanel.classList.remove('visible');
  }

  // ─── Authentication ────────────────────────────────────────────────────────

  async authenticate() {
    // Try to restore from stored tokens first
    const stored = await this.getStoredTokenBundle();
    if (stored?.resourceTokens?.management) {
      const mgmt = stored.resourceTokens.management;
      if (mgmt.expiresAt > Date.now() + this.refreshSafetyWindowMs) {
        this.accessToken = mgmt.accessToken;
        this.resourceTokens = stored.resourceTokens;
        this.debugLog('Restored management token from storage');
        this.updateTenantDisplay(mgmt.payload);
        return;
      }
    }

    // Try silent refresh if we have a refresh token
    if (stored?.refreshToken) {
      try {
        await this.refreshAccessToken(stored.refreshToken);
        this.debugLog('Silent token refresh succeeded');
        return;
      } catch (err) {
        this.debugLog(`Silent refresh failed: ${err.message}`);
      }
    }

    // Try silent auth (prompt=none)
    try {
      await this.performPkceAuth(true);
      this.debugLog('Silent auth succeeded');
      return;
    } catch (err) {
      this.debugLog(`Silent auth failed: ${err.message}`);
    }

    // Interactive PKCE auth
    await this.performPkceAuth(false);
  }

  async performPkceAuth(silent = false) {
    const { codeVerifier, codeChallenge } = await this.generatePkcePair();
    const state = this.generateState();
    const redirectUrl = chrome.identity.getRedirectURL();

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUrl,
      scope: this.managementScopes,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      response_mode: 'query'
    });

    if (silent) {
      params.set('prompt', 'none');
    }

    const authUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;

    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: !silent },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    const responseParams = new URL(responseUrl).searchParams;
    const error = responseParams.get('error');
    if (error) {
      throw new Error(`Auth error: ${error} - ${responseParams.get('error_description') || ''}`);
    }

    const returnedState = responseParams.get('state');
    if (returnedState !== state) {
      throw new Error('State mismatch - possible CSRF');
    }

    const code = responseParams.get('code');
    if (!code) throw new Error('No auth code received');

    await this.exchangeCodeForTokens(code, codeVerifier, redirectUrl);
  }

  async exchangeCodeForTokens(code, codeVerifier, redirectUri) {
    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: this.clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      scope: this.managementScopes
    });

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`Token exchange failed: ${err.error_description || resp.statusText}`);
    }

    const data = await resp.json();
    const payload = this.decodeJwt(data.access_token);

    // Update tenant ID for future requests
    if (payload?.tid) {
      this.tenantId = payload.tid;
      await chrome.storage.local.set({ tenantId: this.tenantId });
    }

    this.accessToken = data.access_token;
    this.resourceTokens.management = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      payload: payload
    };

    await this.storeTokenBundle(data.refresh_token);
    this.updateTenantDisplay(payload);
  }

  async refreshAccessToken(refreshToken) {
    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: this.clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: this.managementScopes
    });

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!resp.ok) {
      throw new Error(`Refresh failed: ${resp.statusText}`);
    }

    const data = await resp.json();
    const payload = this.decodeJwt(data.access_token);

    this.accessToken = data.access_token;
    this.resourceTokens.management = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      payload: payload
    };

    if (payload?.tid) {
      this.tenantId = payload.tid;
    }

    await this.storeTokenBundle(data.refresh_token || refreshToken);
    this.updateTenantDisplay(payload);
  }

  async ensureFreshToken() {
    const mgmt = this.resourceTokens.management;
    if (mgmt && mgmt.expiresAt > Date.now() + this.refreshSafetyWindowMs) {
      return; // Token still fresh
    }
    const stored = await this.getStoredTokenBundle();
    if (stored?.refreshToken) {
      await this.refreshAccessToken(stored.refreshToken);
    } else {
      await this.authenticate();
    }
  }

  // ─── Token Storage ─────────────────────────────────────────────────────────

  async storeTokenBundle(refreshToken) {
    const bundle = {
      refreshToken: refreshToken,
      resourceTokens: this.resourceTokens,
      storedAt: Date.now()
    };
    await chrome.storage.local.set({ tokenBundle: bundle });
  }

  async getStoredTokenBundle() {
    const data = await chrome.storage.local.get('tokenBundle');
    return data.tokenBundle || null;
  }

  async clearAuth() {
    this.accessToken = null;
    this.resourceTokens = {};
    await chrome.storage.local.remove(['tokenBundle']);
    this.elements.tenantInfo.textContent = 'Not logged in';
  }

  async logout() {
    await this.clearAuth();
    this.disabledResources = [];
    this.renderResourceList();
    this.log('Logged out. Tokens cleared.');
  }

  // ─── Resource Scanning ─────────────────────────────────────────────────────

  async scanResources() {
    try {
      this.showProgress(true);
      this.log('Authenticating...');
      await this.authenticate();

      // Load subscriptions if needed
      if (this.subscriptions.length === 0) {
        this.log('Loading subscriptions...');
        await this.loadSubscriptions();
      }

      if (!this.selectedSubscription) {
        this.log('Please select a subscription.');
        this.showProgress(false);
        return;
      }

      this.log(`Scanning subscription: ${this.selectedSubscription.displayName}...`);
      this.disabledResources = [];

      const handlerKeys = Object.keys(RESOURCE_HANDLERS);
      const totalSteps = handlerKeys.length;
      let completed = 0;

      for (const handlerKey of handlerKeys) {
        const handler = RESOURCE_HANDLERS[handlerKey];
        this.updateProgress((completed / totalSteps) * 100);

        try {
          const resources = await this.getResourcesOfType(this.selectedSubscription.subscriptionId, handlerKey, handler.apiVersion);
          this.debugLog(`Found ${resources.length} ${handler.label}`);

          for (const resource of resources) {
            for (const check of handler.checks) {
              if (check.isDisabled(resource)) {
                this.disabledResources.push({
                  resource,
                  handlerKey,
                  handler,
                  check,
                  selected: false,
                  working: false
                });
              }
            }
          }
        } catch (err) {
          this.debugLog(`Error scanning ${handler.label}: ${err.message}`);
        }

        completed++;
      }

      this.updateProgress(100);
      this.renderResourceList();

      const count = this.disabledResources.length;
      if (count === 0) {
        this.log('✓ All resources are properly enabled. Nothing to fix.');
      } else {
        this.log(`Found ${count} disabled resource setting${count > 1 ? 's' : ''}.`);
      }
    } catch (err) {
      this.logError(`Scan failed: ${err.message}`);
    } finally {
      this.showProgress(false);
    }
  }

  async getResourcesOfType(subscriptionId, resourceType, apiVersion) {
    const url = `${this.baseUrl}/subscriptions/${subscriptionId}/providers/${resourceType}?api-version=${apiVersion}`;
    const data = await this.makeApiCall(url);
    return data.value || [];
  }

  async loadSubscriptions() {
    const url = `${this.baseUrl}/subscriptions?api-version=2022-12-01`;
    const data = await this.makeApiCall(url);
    this.subscriptions = (data.value || []).filter(s => s.state === 'Enabled');

    const select = this.elements.subscriptionSelect;
    select.innerHTML = '';

    if (this.subscriptions.length === 0) {
      select.innerHTML = '<option value="">No subscriptions found</option>';
      select.disabled = true;
      return;
    }

    this.subscriptions.forEach((sub, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${sub.displayName} (${sub.subscriptionId.substring(0, 8)}...)`;
      select.appendChild(opt);
    });

    select.disabled = false;
    this.selectedSubscription = this.subscriptions[0];
  }

  onSubscriptionChange() {
    const idx = parseInt(this.elements.subscriptionSelect.value, 10);
    if (!isNaN(idx) && this.subscriptions[idx]) {
      this.selectedSubscription = this.subscriptions[idx];
      this.disabledResources = [];
      this.renderResourceList();
      this.scanResources();
    }
  }

  // ─── Re-enable Operations ──────────────────────────────────────────────────

  async enableSingle(index) {
    const item = this.disabledResources[index];
    if (!item || item.working) return;

    item.working = true;
    this.renderResourceList();

    try {
      const fixConfig = item.check.fix(item.resource);
      this.log(`Enabling: ${item.resource.name} (${item.check.description})...`);

      await this.makeApiCall(fixConfig.url, {
        method: fixConfig.method,
        body: JSON.stringify(fixConfig.body)
      });

      this.log(`✓ Enabled: ${item.resource.name}`);
      this.disabledResources.splice(index, 1);
    } catch (err) {
      this.logError(`Failed to enable ${item.resource.name}: ${err.message}`);
      item.working = false;
    }

    this.renderResourceList();
    this.updateActionButtons();
  }

  async enableSelected() {
    const selected = this.disabledResources.filter(r => r.selected);
    if (selected.length === 0) {
      this.log('No resources selected.');
      return;
    }

    this.log(`Re-enabling ${selected.length} resource(s)...`);
    this.elements.enableSelectedBtn.disabled = true;

    // Process in reverse to avoid index shifting issues
    const indices = [];
    this.disabledResources.forEach((r, i) => { if (r.selected) indices.push(i); });
    indices.reverse();

    for (const idx of indices) {
      await this.enableSingle(idx);
    }

    this.elements.enableSelectedBtn.disabled = false;
    this.updateActionButtons();
  }

  async enableAll() {
    if (this.disabledResources.length === 0) return;

    const count = this.disabledResources.length;
    this.log(`Re-enabling all ${count} resource(s)...`);
    this.elements.enableAllBtn.disabled = true;
    this.showProgress(true);

    let success = 0;
    let fail = 0;
    const total = this.disabledResources.length;

    // Work backwards through the array
    while (this.disabledResources.length > 0) {
      const item = this.disabledResources[0];
      item.working = true;
      this.renderResourceList();
      this.updateProgress(((success + fail) / total) * 100);

      try {
        const fixConfig = item.check.fix(item.resource);
        await this.makeApiCall(fixConfig.url, {
          method: fixConfig.method,
          body: JSON.stringify(fixConfig.body)
        });
        this.disabledResources.shift();
        success++;
        this.debugLog(`✓ ${item.resource.name}`);
      } catch (err) {
        item.working = false;
        this.disabledResources.shift(); // Remove even on failure to avoid infinite loop
        fail++;
        this.logError(`✗ ${item.resource.name}: ${err.message}`);
      }
    }

    this.showProgress(false);
    this.renderResourceList();
    this.updateActionButtons();
    this.log(`Done. ${success} enabled, ${fail} failed.`);
    this.elements.enableAllBtn.disabled = false;
  }

  // ─── UI Rendering ──────────────────────────────────────────────────────────

  renderResourceList() {
    const container = this.elements.resourceList;

    if (this.disabledResources.length === 0) {
      container.innerHTML = '<div class="empty-state">No disabled resources found</div>';
      return;
    }

    // Group by handler type
    const groups = {};
    this.disabledResources.forEach((item, idx) => {
      const key = item.handlerKey;
      if (!groups[key]) {
        groups[key] = { handler: item.handler, items: [] };
      }
      groups[key].items.push({ ...item, index: idx });
    });

    let html = '';
    for (const [key, group] of Object.entries(groups)) {
      html += `<div class="resource-group-header">
        ${group.handler.icon} ${group.handler.label}
        <span class="badge">${group.items.length}</span>
      </div>`;

      for (const item of group.items) {
        const rg = this.extractResourceGroup(item.resource.id);
        const working = item.working ? 'working' : '';
        const checked = item.selected ? 'checked' : '';

        html += `<div class="resource-item">
          <input type="checkbox" class="checkbox" data-index="${item.index}" ${checked} ${item.working ? 'disabled' : ''}>
          <div class="resource-info">
            <div class="resource-name" title="${item.resource.name}">${item.resource.name}</div>
            <div class="resource-detail">${rg} • ${item.resource.location || 'N/A'}</div>
            <div class="resource-issue">${item.check.description}</div>
          </div>
          <button class="enable-btn ${working}" data-index="${item.index}" ${item.working ? 'disabled' : ''}>
            ${item.working ? '...' : 'Enable'}
          </button>
        </div>`;
      }
    }

    container.innerHTML = html;

    // Attach event listeners
    container.querySelectorAll('.enable-btn').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const idx = parseInt(ev.target.dataset.index, 10);
        this.enableSingle(idx);
      });
    });

    container.querySelectorAll('.checkbox').forEach(cb => {
      cb.addEventListener('change', (ev) => {
        const idx = parseInt(ev.target.dataset.index, 10);
        this.disabledResources[idx].selected = ev.target.checked;
        this.updateActionButtons();
      });
    });

    this.updateActionButtons();
  }

  updateActionButtons() {
    const total = this.disabledResources.length;
    const selected = this.disabledResources.filter(r => r.selected).length;
    this.elements.enableAllBtn.disabled = total === 0;
    this.elements.enableSelectedBtn.disabled = selected === 0;
    this.elements.enableAllBtn.textContent = `Re-enable All (${total})`;
    this.elements.enableSelectedBtn.textContent = selected > 0 ? `Re-enable Selected (${selected})` : 'Re-enable Selected';
  }

  updateTenantDisplay(payload) {
    if (!payload) return;
    const name = payload.name || payload.upn || payload.preferred_username || 'Unknown';
    const tenant = payload.tid ? payload.tid.substring(0, 8) + '...' : '';
    this.elements.tenantInfo.textContent = `${name} • Tenant: ${tenant}`;
  }

  extractResourceGroup(resourceId) {
    const match = resourceId?.match(/resourceGroups\/([^/]+)/i);
    return match ? match[1] : 'Unknown';
  }

  // ─── Progress & Logging ────────────────────────────────────────────────────

  showProgress(visible) {
    this.elements.progressBar.classList.toggle('visible', visible);
    if (!visible) this.elements.progressFill.style.width = '0%';
  }

  updateProgress(percent) {
    this.elements.progressFill.style.width = `${Math.min(100, percent)}%`;
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    this.elements.logArea.value += `[${timestamp}] ${message}\n`;
    this.elements.logArea.scrollTop = this.elements.logArea.scrollHeight;
  }

  debugLog(message) {
    if (this.debugMode) this.log(`[DEBUG] ${message}`);
  }

  logError(message) {
    this.log(`[ERROR] ${message}`);
  }

  // ─── API Communication ─────────────────────────────────────────────────────

  async makeApiCall(url, options = {}) {
    await this.ensureFreshToken();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const fetchOptions = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    };

    if (options.body) {
      fetchOptions.body = options.body;
    }

    try {
      const resp = await fetch(url, fetchOptions);
      clearTimeout(timeout);

      if (resp.status === 401) {
        // Token expired mid-request, try refresh
        this.debugLog('Got 401, attempting token refresh...');
        await this.authenticate();
        fetchOptions.headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResp = await fetch(url, { ...fetchOptions, signal: undefined });
        if (!retryResp.ok) {
          const err = await retryResp.text();
          throw new Error(`API error ${retryResp.status}: ${err}`);
        }
        return retryResp.status === 204 ? {} : await retryResp.json();
      }

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`API error ${resp.status}: ${err}`);
      }

      return resp.status === 204 ? {} : await resp.json();
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out (20s)');
      }
      throw err;
    }
  }

  // ─── Crypto Utilities ──────────────────────────────────────────────────────

  async generatePkcePair() {
    const verifierBytes = new Uint8Array(32);
    crypto.getRandomValues(verifierBytes);
    const codeVerifier = this.base64UrlEncode(verifierBytes);

    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = this.base64UrlEncode(new Uint8Array(digest));

    return { codeVerifier, codeChallenge };
  }

  generateState() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return this.base64UrlEncode(bytes);
  }

  base64UrlEncode(buffer) {
    const str = String.fromCharCode(...buffer);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  decodeJwt(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const app = new AzureResourceEnabler();
  app.init();
});
