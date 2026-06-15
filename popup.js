/**
 * Azure Resource Enabler Extension
 * Discovers and re-enables Azure resources disabled by nightly policy.
 * Also supports disabling checks and deleting resources.
 */

// ─── Resource Handlers ─────────────────────────────────────────────────────────
// Each handler defines how to detect, fix, and disable a specific resource type's state.

const RESOURCE_HANDLERS = {
  'Microsoft.Storage/storageAccounts': {
    label: 'Storage Accounts',
    icon: '🗄️',
    apiVersion: '2023-05-01',
    deleteApiVersion: '2023-05-01',
    getConnectionString: async (resource, makeApiCall) => {
      const url = `https://management.azure.com${resource.id}/listKeys?api-version=2023-05-01`;
      const data = await makeApiCall(url, { method: 'POST', body: JSON.stringify({}) });
      const key = data.keys?.[0]?.value;
      if (!key) throw new Error('No keys found');
      return `DefaultEndpointsProtocol=https;AccountName=${resource.name};AccountKey=${key};EndpointSuffix=core.windows.net`;
    },
    checks: [
      {
        id: 'sharedKeyAccess',
        description: 'Shared key access disabled',
        disableDescription: 'Disable Shared Key Access',
        isDisabled: (resource) => resource.properties?.allowSharedKeyAccess === false,
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2023-05-01`,
          body: { properties: { allowSharedKeyAccess: true } }
        }),
        disable: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2023-05-01`,
          body: { properties: { allowSharedKeyAccess: false } }
        })
      },
      {
        id: 'publicNetworkAccess',
        description: 'Public network access disabled',
        disableDescription: 'Disable Public Network Access',
        isDisabled: (resource) => resource.properties?.publicNetworkAccess === 'Disabled',
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2023-05-01`,
          body: { properties: { publicNetworkAccess: 'Enabled' } }
        }),
        disable: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2023-05-01`,
          body: { properties: { publicNetworkAccess: 'Disabled' } }
        })
      }
    ]
  },
  'Microsoft.EventHub/namespaces': {
    label: 'Event Hubs',
    icon: '⚡',
    apiVersion: '2024-01-01',
    deleteApiVersion: '2024-01-01',
    getConnectionString: async (resource, makeApiCall) => {
      const url = `https://management.azure.com${resource.id}/authorizationRules/RootManageSharedAccessKey/listKeys?api-version=2024-01-01`;
      const data = await makeApiCall(url, { method: 'POST', body: JSON.stringify({}) });
      if (!data.primaryConnectionString) throw new Error('No connection string returned. The RootManageSharedAccessKey rule may not exist.');
      return data.primaryConnectionString;
    },
    checks: [
      {
        id: 'localAuth',
        description: 'Local authentication disabled',
        disableDescription: 'Disable Local Authentication',
        isDisabled: (resource) => resource.properties?.disableLocalAuth === true,
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2024-01-01`,
          body: { properties: { disableLocalAuth: false } }
        }),
        disable: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2024-01-01`,
          body: { properties: { disableLocalAuth: true } }
        })
      }
    ]
  },
  'Microsoft.Sql/servers': {
    label: 'Azure SQL Servers',
    icon: '🛢️',
    apiVersion: '2023-08-01-preview',
    deleteApiVersion: '2023-08-01-preview',
    getConnectionString: async (resource) => {
      return `Server=tcp:${resource.name}.database.windows.net,1433;`;
    },
    checks: [
      {
        id: 'publicNetworkAccess',
        description: 'Public network access disabled',
        disableDescription: 'Disable Public Network Access',
        isDisabled: (resource) => resource.properties?.publicNetworkAccess === 'Disabled',
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2023-08-01-preview`,
          body: { properties: { publicNetworkAccess: 'Enabled' } }
        }),
        disable: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2023-08-01-preview`,
          body: { properties: { publicNetworkAccess: 'Disabled' } }
        })
      }
    ]
  },
  'Microsoft.DocumentDB/databaseAccounts': {
    label: 'Cosmos DB',
    icon: '🌐',
    apiVersion: '2024-05-15',
    deleteApiVersion: '2024-05-15',
    getConnectionString: async (resource, makeApiCall) => {
      const url = `https://management.azure.com${resource.id}/listKeys?api-version=2024-05-15`;
      const data = await makeApiCall(url, { method: 'POST', body: JSON.stringify({}) });
      if (!data.primaryMasterKey) throw new Error('No primary key returned');
      return `AccountEndpoint=https://${resource.name}.documents.azure.com:443/;AccountKey=${data.primaryMasterKey};`;
    },
    checks: [
      {
        id: 'publicNetworkAccess',
        description: 'Public network access disabled',
        disableDescription: 'Disable Public Network Access',
        isDisabled: (resource) => resource.properties?.publicNetworkAccess === 'Disabled',
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2024-05-15`,
          body: { properties: { publicNetworkAccess: 'Enabled' } }
        }),
        disable: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2024-05-15`,
          body: { properties: { publicNetworkAccess: 'Disabled' } }
        })
      }
    ]
  },
  'Microsoft.KeyVault/vaults': {
    label: 'Key Vaults',
    icon: '🔑',
    apiVersion: '2023-07-01',
    deleteApiVersion: '2023-07-01',
    getConnectionString: async (resource) => {
      return `https://${resource.name}.vault.azure.net/`;
    },
    checks: [
      {
        id: 'publicNetworkAccess',
        description: 'Public network access disabled',
        disableDescription: 'Disable Public Network Access',
        isDisabled: (resource) => resource.properties?.publicNetworkAccess === 'Disabled',
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2023-07-01`,
          body: { properties: { publicNetworkAccess: 'Enabled' } }
        }),
        disable: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2023-07-01`,
          body: { properties: { publicNetworkAccess: 'Disabled' } }
        })
      }
    ]
  },
  'Microsoft.ServiceBus/namespaces': {
    label: 'Service Bus',
    icon: '🚌',
    apiVersion: '2022-10-01-preview',
    deleteApiVersion: '2022-10-01-preview',
    getConnectionString: async (resource, makeApiCall) => {
      const url = `https://management.azure.com${resource.id}/authorizationRules/RootManageSharedAccessKey/listKeys?api-version=2022-10-01-preview`;
      const data = await makeApiCall(url, { method: 'POST', body: JSON.stringify({}) });
      if (!data.primaryConnectionString) throw new Error('No connection string returned. The RootManageSharedAccessKey rule may not exist.');
      return data.primaryConnectionString;
    },
    checks: [
      {
        id: 'localAuth',
        description: 'Local authentication disabled',
        disableDescription: 'Disable Local Authentication',
        isDisabled: (resource) => resource.properties?.disableLocalAuth === true,
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2022-10-01-preview`,
          body: { properties: { disableLocalAuth: false } }
        }),
        disable: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2022-10-01-preview`,
          body: { properties: { disableLocalAuth: true } }
        })
      }
    ]
  },
  'Microsoft.MachineLearningServices/workspaces': {
    label: 'AI Foundry',
    icon: '🤖',
    apiVersion: '2024-04-01',
    deleteApiVersion: '2024-04-01',
    checks: [
      {
        id: 'publicNetworkAccess',
        description: 'Public network access disabled',
        disableDescription: 'Disable Public Network Access',
        isDisabled: (resource) => resource.properties?.publicNetworkAccess === 'Disabled',
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2024-04-01`,
          body: { properties: { publicNetworkAccess: 'Enabled' } }
        }),
        disable: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2024-04-01`,
          body: { properties: { publicNetworkAccess: 'Disabled' } }
        })
      },
      {
        id: 'sharedKeyAccess',
        description: 'Shared key access disabled (v1LegacyMode)',
        disableDescription: 'Disable Shared Key Access',
        isDisabled: (resource) => resource.properties?.v1LegacyMode === false && resource.properties?.allowKeyBasedAuthentication === false,
        fix: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2024-04-01`,
          body: { properties: { allowKeyBasedAuthentication: true } }
        }),
        disable: (resource) => ({
          method: 'PATCH',
          url: `https://management.azure.com${resource.id}?api-version=2024-04-01`,
          body: { properties: { allowKeyBasedAuthentication: false } }
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
    this.disabledResources = []; // { resource, handlerKey, handler, failedChecks, selected, working }
    this.enabledResources = [];  // { resource, handlerKey, handler, passedChecks }
    this.activeTab = 'disabled';
    this.selectedSubscription = null;
    this.debugMode = false;
    this.autoRefreshOnOpen = false;
    this.deleteTarget = null; // resource pending delete confirmation
    this.sqlDatabases = []; // { serverName, serverResourceGroup, dbName, dbId, status, skuName, isServerless, location }
    this.serverlessOnly = false;
    this.resourceCosts = {}; // { resourceId.toLowerCase(): { cost, currency } }
    this.previousMonthCosts = {}; // { resourceId.toLowerCase(): { cost, currency } }
    this.policyData = null; // { totalResources, compliantCount, nonCompliantCount, compliancePercentage, assignments: [] }
    this.policyDetailAssignment = null;
    this.policyDetailResources = [];
    this.policyDetailLoading = false;

    // Fabric Capacity state
    this.fabricCapacities = [];
    this.fabricSelectedIndices = new Set();
    this.fabricSelectedIndex = null;
    this.fabricAvailableSkus = [];
    this.fabricCosts = {}; // { resourceId.toLowerCase(): { cost, currency } }

    // Databricks state
    this.databricksWorkspaces = [];
    this.databricksClusters = []; // { cluster, workspace, subscriptionId, subscriptionName }
    this.databricksSelectedIndices = new Set();
    this.databricksCosts = {}; // { resourceId.toLowerCase(): { cost, currency } }

    // Synapse state
    this.synapseWorkspaces = [];
    this.synapsePools = []; // { pool, workspace, subscriptionId, subscriptionName }
    this.synapseSelectedIndices = new Set();
    this.synapseCosts = {}; // { resourceId.toLowerCase(): { cost, currency } }

    // Cost Summary state
    this.costSummaryData = []; // [{ resourceGroup, serviceName, resourceName, resourceId, cost, currency }]
    this.budget = 1500;

    // Config
    this.baseUrl = 'https://management.azure.com';
    this.graphUrl = 'https://graph.microsoft.com';
    this.defaultClientId = 'b75cf7c4-8802-401f-8daa-226d5cb55f78';
    this.clientId = this.defaultClientId;
    this.tenantId = '17ab6ae4-62da-43e0-9140-dddeb0a17bf0';
    this.managementScopes = 'https://management.core.windows.net/user_impersonation offline_access openid profile';
    this.databricksScopes = '2ff814a6-3304-4ab8-85cb-cd0e6f879c1d/user_impersonation offline_access';
    this.graphScopes = 'https://graph.microsoft.com/User.Read openid profile';
    this.refreshSafetyWindowMs = 3 * 60 * 1000;
    this.fabricApiVersion = '2023-11-01';

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
      actionBar: document.getElementById('actionBar'),
      logArea: document.getElementById('logArea'),
      debugToggle: document.getElementById('debugToggle'),
      autoRefreshToggle: document.getElementById('autoRefreshToggle'),
      logoutBtn: document.getElementById('logoutBtn'),
      disabledCount: document.getElementById('disabledCount'),
      enabledCount: document.getElementById('enabledCount'),
      selectAllToolbar: document.getElementById('selectAllToolbar'),
      selectAllCheckbox: document.getElementById('selectAllCheckbox'),
      deleteModal: document.getElementById('deleteModal'),
      deleteResourceName: document.getElementById('deleteResourceName'),
      deleteResourceType: document.getElementById('deleteResourceType'),
      deleteConfirmInput: document.getElementById('deleteConfirmInput'),
      deleteCancelBtn: document.getElementById('deleteCancelBtn'),
      deleteConfirmBtn: document.getElementById('deleteConfirmBtn'),
      sqlDbCount: document.getElementById('sqlDbCount'),
      policyNonCompliantCount: document.getElementById('policyNonCompliantCount'),
      sqlFilterToolbar: document.getElementById('sqlFilterToolbar'),
      serverlessOnlyToggle: document.getElementById('serverlessOnlyToggle'),
      // Fabric elements
      fabricCount: document.getElementById('fabricCount'),
      fabricControls: document.getElementById('fabricControls'),
      fabricSkuSelect: document.getElementById('fabricSkuSelect'),
      fabricUpdateSkuBtn: document.getElementById('fabricUpdateSkuBtn'),
      fabricStartBtn: document.getElementById('fabricStartBtn'),
      fabricStopBtn: document.getElementById('fabricStopBtn'),
      // Databricks elements
      databricksCount: document.getElementById('databricksCount'),
      databricksControls: document.getElementById('databricksControls'),
      databricksStartBtn: document.getElementById('databricksStartBtn'),
      databricksStopBtn: document.getElementById('databricksStopBtn'),
      databricksCreateToggleBtn: document.getElementById('databricksCreateToggleBtn'),
      databricksCreateForm: document.getElementById('databricksCreateForm'),
      dbClusterName: document.getElementById('dbClusterName'),
      dbNodeType: document.getElementById('dbNodeType'),
      dbWorkerCount: document.getElementById('dbWorkerCount'),
      databricksCreateSubmitBtn: document.getElementById('databricksCreateSubmitBtn'),
      databricksCreateCancelBtn: document.getElementById('databricksCreateCancelBtn'),
      // Synapse elements
      synapseCount: document.getElementById('synapseCount'),
      synapseControls: document.getElementById('synapseControls'),
      synapseResumeBtn: document.getElementById('synapseResumeBtn'),
      synapsePauseBtn: document.getElementById('synapsePauseBtn'),
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

    // Tab switching
    document.querySelectorAll('.tab-bar .tab').forEach(tab => {
      tab.addEventListener('click', (ev) => {
        this.activeTab = ev.currentTarget.dataset.tab;
        document.querySelectorAll('.tab-bar .tab').forEach(t => t.classList.remove('active'));
        ev.currentTarget.classList.add('active');
        this.renderResourceList();
        this.updateActionBarVisibility();
      });
    });

    // Serverless only toggle
    e.serverlessOnlyToggle.addEventListener('change', () => {
      this.serverlessOnly = e.serverlessOnlyToggle.checked;
      this.updateSqlDbCount();
      this.renderResourceList();
    });

    // Select all checkbox
    e.selectAllCheckbox.addEventListener('change', (ev) => {
      this.onSelectAllChange(ev.target.checked);
    });

    // Delete modal
    e.deleteCancelBtn.addEventListener('click', () => this.closeDeleteModal());
    e.deleteConfirmInput.addEventListener('input', () => this.validateDeleteInput());
    e.deleteConfirmBtn.addEventListener('click', () => this.confirmDelete());

    // Event delegation for connection string copy
    e.resourceList.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('.conn-str-btn');
      if (!btn) return;

      const resourceId = btn.dataset.resourceId;
      const handlerKey = btn.dataset.handlerKey;
      const handler = RESOURCE_HANDLERS[handlerKey];

      if (!handler?.getConnectionString) return;

      try {
        btn.textContent = '⏳';
        btn.disabled = true;

        // Find the resource object
        const allResources = [...this.disabledResources, ...this.enabledResources];
        const entry = allResources.find(r => r.resource.id === resourceId);
        if (!entry) throw new Error('Resource not found');

        const connStr = await handler.getConnectionString(entry.resource, (url, opts) => this.makeApiCall(url, opts));

        await navigator.clipboard.writeText(connStr);
        btn.textContent = '✓';
        this.log(`Copied connection string for ${entry.resource.name}`);

        setTimeout(() => { btn.textContent = '📋'; btn.disabled = false; }, 2000);
      } catch (err) {
        btn.textContent = '✗';
        this.logError(`Failed to copy connection string: ${err.message}`);
        setTimeout(() => { btn.textContent = '📋'; btn.disabled = false; }, 2000);
      }
    });

    // Event delegation for SQL pause/resume
    e.resourceList.addEventListener('click', async (ev) => {
        const resumeBtn = ev.target.closest('.sql-resume-btn');
        const pauseBtn = ev.target.closest('.sql-pause-btn');

        if (resumeBtn) {
          await this.resumeSqlDatabase(resumeBtn);
        } else if (pauseBtn) {
          await this.pauseSqlDatabase(pauseBtn);
        }
    });

    // Event delegation for policy drill-down
    e.resourceList.addEventListener('click', async (ev) => {
      const backBtn = ev.target.closest('.policy-back-btn');
      if (backBtn && this.activeTab === 'policy') {
        this.policyDetailAssignment = null;
        this.policyDetailResources = [];
        this.policyDetailLoading = false;
        this.renderResourceList();
        return;
      }

      const drillTarget = ev.target.closest('.policy-drill-btn') || ev.target.closest('.policy-row');
      if (drillTarget && this.activeTab === 'policy') {
        const assignmentId = drillTarget.dataset.assignmentId;
        if (assignmentId && !this.policyDetailAssignment) {
          this.policyDetailAssignment = assignmentId;
          this.policyDetailResources = [];
          this.policyDetailLoading = true;
          this.renderResourceList();
          await this.fetchPolicyDetailResources(assignmentId);
        }
      }
    });

    // Fabric capacity event listeners
    e.fabricStartBtn.addEventListener('click', () => this.fabricStartCapacity());
    e.fabricStopBtn.addEventListener('click', () => this.fabricStopCapacity());
    e.fabricUpdateSkuBtn.addEventListener('click', () => this.fabricUpdateSku());
    e.fabricSkuSelect.addEventListener('change', () => {
      const hasSelection = this.fabricSelectedIndex !== null || this.fabricSelectedIndices.size > 0;
      e.fabricUpdateSkuBtn.disabled = !hasSelection || !e.fabricSkuSelect.value;
    });

    // Databricks event listeners
    e.databricksStartBtn.addEventListener('click', () => this.databricksStartCluster());
    e.databricksStopBtn.addEventListener('click', () => this.databricksStopCluster());
    e.databricksCreateToggleBtn.addEventListener('click', () => this.toggleDatabricksCreateForm());
    e.databricksCreateSubmitBtn.addEventListener('click', () => this.databricksCreateCluster());
    e.databricksCreateCancelBtn.addEventListener('click', () => this.hideDatabricksCreateForm());

    // Synapse event listeners
    e.synapseResumeBtn.addEventListener('click', () => this.synapseResumePool());
    e.synapsePauseBtn.addEventListener('click', () => this.synapsePausePool());
  }

  // ─── Settings ──────────────────────────────────────────────────────────────

  async loadSettings() {
    const data = await chrome.storage.local.get(['clientId', 'tenantId', 'debugMode', 'autoRefreshOnOpen', 'budget']);
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
    if (data.budget !== undefined && data.budget !== null) {
      this.budget = parseFloat(data.budget) || 1500;
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

  async getDatabricksToken() {
    const dbToken = this.resourceTokens.databricks;
    if (dbToken && dbToken.expiresAt > Date.now() + this.refreshSafetyWindowMs) {
      return dbToken.accessToken;
    }

    const stored = await this.getStoredTokenBundle();
    if (!stored?.refreshToken) {
      throw new Error('No refresh token available. Please log in again.');
    }

    // Try silent token exchange first
    try {
      return await this._exchangeDatabricksToken(stored.refreshToken);
    } catch (err) {
      // If consent is needed, trigger interactive auth for Databricks scope
      if (err.message.includes('AADSTS65001') || err.message.includes('consent')) {
        this.log('Requesting Databricks consent...');
        return await this._interactiveDatabricksConsent();
      }
      throw err;
    }
  }

  async _exchangeDatabricksToken(refreshToken) {
    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: this.clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: this.databricksScopes
    });

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`Databricks token exchange failed: ${err.error_description || resp.statusText}`);
    }

    const data = await resp.json();
    this.resourceTokens.databricks = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    if (data.refresh_token) {
      await this.storeTokenBundle(data.refresh_token);
    }

    return data.access_token;
  }

  async _interactiveDatabricksConsent() {
    const { codeVerifier, codeChallenge } = await this.generatePkcePair();
    const state = this.generateState();
    const redirectUrl = chrome.identity.getRedirectURL();

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUrl,
      scope: this.databricksScopes,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      response_mode: 'query',
      prompt: 'consent'
    });

    const authUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;

    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
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
      throw new Error(`Databricks consent failed: ${error} - ${responseParams.get('error_description') || ''}`);
    }

    const returnedState = responseParams.get('state');
    if (returnedState !== state) {
      throw new Error('State mismatch - possible CSRF');
    }

    const code = responseParams.get('code');
    if (!code) throw new Error('No auth code received for Databricks consent');

    // Exchange code for Databricks token
    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: this.clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUrl,
      code_verifier: codeVerifier,
      scope: this.databricksScopes
    });

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`Databricks token exchange failed: ${err.error_description || resp.statusText}`);
    }

    const data = await resp.json();
    this.resourceTokens.databricks = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    if (data.refresh_token) {
      await this.storeTokenBundle(data.refresh_token);
    }

    return data.access_token;
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
    this.enabledResources = [];
    this.sqlDatabases = [];
    this.policyData = null;
    this.policyDetailAssignment = null;
    this.policyDetailResources = [];
    this.policyDetailLoading = false;
    this.renderResourceList();
    this.updateTabCounts();
    this.updateSqlDbCount();
    this.updatePolicyCount();
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
      this.enabledResources = [];

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
            const failedChecks = [];
            const passedChecks = [];

            for (const check of handler.checks) {
              if (check.isDisabled(resource)) {
                failedChecks.push(check);
              } else {
                passedChecks.push(check);
              }
            }

            if (failedChecks.length > 0) {
              this.disabledResources.push({
                resource,
                handlerKey,
                handler,
                failedChecks,
                selected: false,
                working: false
              });
            } else {
              this.enabledResources.push({
                resource,
                handlerKey,
                handler,
                passedChecks
              });
            }
          }
        } catch (err) {
          this.debugLog(`Error scanning ${handler.label}: ${err.message}`);
        }

        completed++;
      }

      this.updateProgress(100);
      this.updateTabCounts();
      this.renderResourceList();
      this.updateActionBarVisibility();

      const disCount = this.disabledResources.length;
      const enCount = this.enabledResources.length;
      if (disCount === 0) {
        this.log(`✓ All ${enCount} resources are properly enabled. Nothing to fix.`);
      } else {
        this.log(`Found ${disCount} disabled resource(s), ${enCount} enabled.`);
      }

      // Fetch cost summary (single query for all services)
      await this.fetchCostSummary();

      // Also scan SQL database status
      await this.scanSqlDatabases();

      // Scan policy compliance
      await this.scanPolicyCompliance();

      // Scan Fabric capacities
      await this.scanFabricCapacities();

      // Scan Databricks clusters
      await this.scanDatabricksClusters();

      // Scan Synapse pools
      await this.scanSynapsePools();
    } catch (err) {
      this.logError(`Scan failed: ${err.message}`);
    } finally {
      this.showProgress(false);
    }
  }

  async scanSqlDatabases() {
    try {
      if (!this.selectedSubscription) return;
      this.sqlDatabases = [];
      this.log('Scanning SQL database status...');

      // Get all SQL servers
      const servers = await this.getResourcesOfType(
        this.selectedSubscription.subscriptionId,
        'Microsoft.Sql/servers',
        '2023-08-01-preview'
      );

      if (servers.length === 0) {
        this.log('No SQL servers found.');
        this.updateSqlDbCount();
        this.renderResourceList();
        return;
      }

      this.debugLog(`Found ${servers.length} SQL server(s). Fetching databases...`);

      // Fetch databases for each server (batch 5 at a time to avoid throttling)
      const batchSize = 5;
      for (let i = 0; i < servers.length; i += batchSize) {
        const batch = servers.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(server => this.fetchDatabasesForServer(server))
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            this.sqlDatabases.push(...result.value);
          }
        }
      }

      const serverlessCount = this.sqlDatabases.filter(db => db.isServerless).length;
      this.log(`Found ${this.sqlDatabases.length} database(s) across ${servers.length} server(s) (${serverlessCount} serverless).`);
      this.updateSqlDbCount();
      this.renderResourceList();
    } catch (err) {
      this.logError(`SQL database scan failed: ${err.message}`);
    }
  }

  async fetchDatabasesForServer(server) {
    try {
      const url = `${this.baseUrl}${server.id}/databases?api-version=2023-08-01-preview`;
      const data = await this.makeApiCall(url);
      const databases = data.value || [];

      // Extract resource group from server ID
      const rgMatch = server.id.match(/\/resourceGroups\/([^/]+)\//i);
      const resourceGroup = rgMatch ? rgMatch[1] : 'Unknown';

      return databases
        .filter(db => db.name.toLowerCase() !== 'master') // Skip system DB
        .map(db => ({
          serverName: server.name,
          serverResourceGroup: resourceGroup,
          dbName: db.name,
          dbId: db.id,
          status: db.properties?.status || 'Unknown',
          skuName: db.sku?.name || 'Unknown',
          isServerless: /^GP_S_/i.test(db.sku?.name || ''),
          location: db.location || server.location
        }));
    } catch (err) {
      this.debugLog(`Error fetching databases for server ${server.name}: ${err.message}`);
      return [];
    }
  }

  // ─── Cost Management ──────────────────────────────────────────────────────
  async fetchResourceCosts() {
    if (!this.selectedSubscription) return;
    
    try {
      this.debugLog('Fetching resource costs...');
      const subscriptionId = this.selectedSubscription.subscriptionId;
      const url = `${this.baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;
      
      // Fetch current month (MTD)
      const body = JSON.stringify({
        type: 'ActualCost',
        timeframe: 'MonthToDate',
        dataset: {
          granularity: 'None',
          aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
          grouping: [{ type: 'Dimension', name: 'ResourceId' }]
        }
      });
      
      const data = await this.makeApiCall(url, { method: 'POST', body });
      
      this.resourceCosts = {};
      if (data.properties?.rows) {
        for (const row of data.properties.rows) {
          const cost = row[0];
          const resourceId = row[1];
          const currency = row[2] || 'USD';
          if (resourceId && cost > 0) {
            this.resourceCosts[resourceId.toLowerCase()] = { cost, currency };
          }
        }
      }
      
      this.debugLog(`Fetched costs for ${Object.keys(this.resourceCosts).length} resources.`);

      // Fetch previous month for trend comparison
      await this.fetchPreviousMonthCosts(subscriptionId);

      this.renderResourceList();
    } catch (err) {
      this.debugLog(`Cost fetch failed (non-critical): ${err.message}`);
      this.resourceCosts = {};
    }
  }

  async fetchPreviousMonthCosts(subscriptionId) {
    try {
      const now = new Date();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month

      const from = prevMonthStart.toISOString().split('T')[0];
      const to = prevMonthEnd.toISOString().split('T')[0];

      const url = `${this.baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;
      const body = JSON.stringify({
        type: 'ActualCost',
        timeframe: 'Custom',
        timePeriod: { from, to },
        dataset: {
          granularity: 'None',
          aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
          grouping: [{ type: 'Dimension', name: 'ResourceId' }]
        }
      });

      const data = await this.makeApiCall(url, { method: 'POST', body });
      this.previousMonthCosts = {};
      if (data.properties?.rows) {
        for (const row of data.properties.rows) {
          const cost = row[0];
          const resourceId = row[1];
          const currency = row[2] || 'USD';
          if (resourceId && cost > 0) {
            this.previousMonthCosts[resourceId.toLowerCase()] = { cost, currency };
          }
        }
      }
      this.debugLog(`Fetched previous month costs for ${Object.keys(this.previousMonthCosts).length} resources.`);
    } catch (err) {
      this.debugLog(`Previous month cost fetch failed (non-critical): ${err.message}`);
      this.previousMonthCosts = {};
    }
  }

  getResourceTrendIcon(resourceId) {
    if (!this.resourceCosts || !this.previousMonthCosts) return '';
    const current = this.resourceCosts[resourceId.toLowerCase()];
    const previous = this.previousMonthCosts[resourceId.toLowerCase()];
    if (!current || current.cost < 0.01) return '';

    // If no previous data, treat as new (trending up)
    if (!previous || previous.cost < 0.01) {
      return '<span class="trend-icon trend-up" title="New spend this month">📈</span>';
    }

    // Normalize: compare current MTD daily rate vs previous month daily rate
    const now = new Date();
    const dayOfMonth = now.getDate();
    const currentDailyRate = current.cost / Math.max(dayOfMonth, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevDaysInMonth = prevMonthEnd.getDate();
    const prevDailyRate = previous.cost / prevDaysInMonth;

    const threshold = 0.05; // 5% change threshold
    if (currentDailyRate > prevDailyRate * (1 + threshold)) {
      return '<span class="trend-icon trend-up" title="Spending trending up vs last month">📈</span>';
    } else if (currentDailyRate < prevDailyRate * (1 - threshold)) {
      return '<span class="trend-icon trend-down" title="Spending trending down vs last month">📉</span>';
    } else {
      return '<span class="trend-icon trend-flat" title="Spending about the same... the sloth approves">🦥</span>';
    }
  }

  getResourceCostHtml(resourceId) {
    if (!this.resourceCosts) return '';
    const entry = this.resourceCosts[resourceId.toLowerCase()];
    if (!entry || entry.cost < 0.01) return '';
    
    const formatted = entry.cost < 1 
      ? `$${entry.cost.toFixed(2)}` 
      : entry.cost < 100 
        ? `$${entry.cost.toFixed(2)}`
        : `$${Math.round(entry.cost).toLocaleString()}`;
    
    const trend = this.getResourceTrendIcon(resourceId);
    return `<span class="cost-badge" title="Month-to-date cost">${formatted}${trend}</span>`;
  }

  // ─── Policy Compliance ────────────────────────────────────────────────────

  async scanPolicyCompliance() {
    if (!this.selectedSubscription) return;

    try {
      this.log('Scanning policy compliance...');
      const subscriptionId = this.selectedSubscription.subscriptionId;
      const url = `${this.baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize?api-version=2019-10-01`;
      const data = await this.makeApiCall(url, { method: 'POST', body: JSON.stringify({}) });

      const summary = data.value?.[0];
      if (!summary) {
        this.policyData = {
          totalResources: 0,
          compliantCount: 0,
          nonCompliantCount: 0,
          compliancePercentage: 100,
          assignments: []
        };
        this.policyDetailAssignment = null;
        this.policyDetailResources = [];
        this.policyDetailLoading = false;
        this.log('No policy data found.');
        this.updatePolicyCount();
        this.renderResourceList();
        return;
      }

      const results = summary.results || {};
      const totalResources = results.totalResources || 0;
      const nonCompliantResources = results.nonCompliantResources || 0;
      const compliantResources = Math.max(totalResources - nonCompliantResources, 0);
      const compliancePercentage = totalResources > 0
        ? Math.round((compliantResources / totalResources) * 100)
        : 100;

      const assignments = (summary.policyAssignments || [])
        .filter(a => (a.results?.nonCompliantResources || 0) > 0)
        .sort((a, b) => (b.results?.nonCompliantResources || 0) - (a.results?.nonCompliantResources || 0))
        .slice(0, 20)
        .map(a => ({
          assignmentId: a.policyAssignmentId,
          assignmentName: a.policyAssignmentId?.split('/').pop() || 'Unknown',
          policyDefinitionId: a.policyDefinitions?.[0]?.policyDefinitionId || '',
          policyDefinitionName: a.policyDefinitions?.[0]?.policyDefinitionId?.split('/').pop() || 'Unknown Policy',
          nonCompliantResources: a.results?.nonCompliantResources || 0,
          totalResources: a.results?.totalResources || 0
        }));

      this.policyData = {
        totalResources,
        compliantCount: compliantResources,
        nonCompliantCount: nonCompliantResources,
        compliancePercentage,
        assignments
      };

      if (!assignments.some(a => a.assignmentId === this.policyDetailAssignment)) {
        this.policyDetailAssignment = null;
        this.policyDetailResources = [];
        this.policyDetailLoading = false;
      }

      this.log(`Policy compliance: ${compliancePercentage}% (${nonCompliantResources} non-compliant resources across ${assignments.length} policies).`);
      this.updatePolicyCount();
      this.renderResourceList();
    } catch (err) {
      this.debugLog(`Policy compliance scan failed: ${err.message}`);
      this.policyData = null;
      this.policyDetailAssignment = null;
      this.policyDetailResources = [];
      this.policyDetailLoading = false;
      this.updatePolicyCount();
      if (this.activeTab === 'policy') {
        this.renderResourceList();
      }
    }
  }

  async fetchPolicyDetailResources(assignmentId) {
    if (!this.selectedSubscription) return;

    try {
      this.policyDetailLoading = true;
      const subscriptionId = this.selectedSubscription.subscriptionId;
      const filter = encodeURIComponent(`policyAssignmentId eq '${assignmentId}' and complianceState eq 'NonCompliant'`);
      const url = `${this.baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.PolicyInsights/policyStates/latest/queryResults?api-version=2019-10-01&$filter=${filter}&$top=50`;
      const data = await this.makeApiCall(url, { method: 'POST', body: JSON.stringify({}) });

      this.policyDetailResources = (data.value || []).map(r => ({
        resourceId: r.resourceId || '',
        resourceName: r.resourceId?.split('/').pop() || 'Unknown',
        resourceType: r.resourceType || 'Unknown',
        resourceGroup: r.resourceGroup || 'Unknown',
        complianceState: r.complianceState || 'NonCompliant',
        policyDefinitionAction: r.policyDefinitionAction || 'Unknown',
        timestamp: r.timestamp || ''
      }));

    } catch (err) {
      this.logError(`Failed to fetch policy details: ${err.message}`);
      this.policyDetailResources = [];
    } finally {
      this.policyDetailLoading = false;
      this.renderResourceList();
    }
  }

  updatePolicyCount() {
    if (this.elements.policyNonCompliantCount) {
      this.elements.policyNonCompliantCount.textContent = this.policyData?.nonCompliantCount || 0;
    }
  }

  async resumeSqlDatabase(btn) {
    const dbId = btn.dataset.dbId;
    const dbName = btn.dataset.dbName;

    try {
      btn.disabled = true;
      btn.textContent = '⏳ Resuming...';
      this.log(`Resuming database: ${dbName}...`);

      const url = `${this.baseUrl}${dbId}/resume?api-version=2023-08-01-preview`;
      await this.makeApiCall(url, { method: 'POST', body: JSON.stringify({}) });

      // Update local state
      const db = this.sqlDatabases.find(d => d.dbId === dbId);
      if (db) db.status = 'Resuming';

      this.log(`✓ Resume initiated for ${dbName}. Status will update on next refresh.`);
      this.renderResourceList();

      // Auto-refresh status after 30 seconds
      setTimeout(() => {
        if (this.activeTab === 'sqlstatus') {
          this.scanSqlDatabases();
        }
      }, 30000);
    } catch (err) {
      btn.textContent = '▶ Resume';
      btn.disabled = false;
      this.logError(`Failed to resume ${dbName}: ${err.message}`);
    }
  }

  async pauseSqlDatabase(btn) {
    const dbId = btn.dataset.dbId;
    const dbName = btn.dataset.dbName;

    // Confirmation prompt
    if (!confirm(`Are you sure you want to PAUSE "${dbName}"?\n\nThis will make the database unavailable until manually resumed.`)) {
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = '⏳ Pausing...';
      this.log(`Pausing database: ${dbName}...`);

      const url = `${this.baseUrl}${dbId}/pause?api-version=2023-08-01-preview`;
      await this.makeApiCall(url, { method: 'POST', body: JSON.stringify({}) });

      // Update local state
      const db = this.sqlDatabases.find(d => d.dbId === dbId);
      if (db) db.status = 'Pausing';

      this.log(`✓ Pause initiated for ${dbName}. Status will update on next refresh.`);
      this.renderResourceList();

      // Auto-refresh status after 15 seconds
      setTimeout(() => {
        if (this.activeTab === 'sqlstatus') {
          this.scanSqlDatabases();
        }
      }, 15000);
    } catch (err) {
      btn.textContent = '⏸ Pause';
      btn.disabled = false;
      this.logError(`Failed to pause ${dbName}: ${err.message}`);
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
      this.enabledResources = [];
      this.sqlDatabases = [];
      this.resourceCosts = {};
      this.policyData = null;
      this.policyDetailAssignment = null;
      this.policyDetailResources = [];
      this.policyDetailLoading = false;
      this.renderResourceList();
      this.updateTabCounts();
      this.updateSqlDbCount();
      this.updatePolicyCount();
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
      // Enable all failed checks for this resource
      for (const check of item.failedChecks) {
        const fixConfig = check.fix(item.resource);
        this.log(`Enabling: ${item.resource.name} (${check.description})...`);

        await this.makeApiCall(fixConfig.url, {
          method: fixConfig.method,
          body: JSON.stringify(fixConfig.body)
        });
      }

      this.log(`✓ Enabled: ${item.resource.name}`);
      // Move to enabled list
      const allChecks = item.handler.checks;
      this.enabledResources.push({
        resource: item.resource,
        handlerKey: item.handlerKey,
        handler: item.handler,
        passedChecks: allChecks.slice()
      });
      this.disabledResources.splice(index, 1);
    } catch (err) {
      this.logError(`Failed to enable ${item.resource.name}: ${err.message}`);
      item.working = false;
    }

    this.updateTabCounts();
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

    // Work through the array
    while (this.disabledResources.length > 0) {
      const item = this.disabledResources[0];
      item.working = true;
      this.renderResourceList();
      this.updateProgress(((success + fail) / total) * 100);

      try {
        for (const check of item.failedChecks) {
          const fixConfig = check.fix(item.resource);
          await this.makeApiCall(fixConfig.url, {
            method: fixConfig.method,
            body: JSON.stringify(fixConfig.body)
          });
        }
        // Move to enabled
        this.enabledResources.push({
          resource: item.resource,
          handlerKey: item.handlerKey,
          handler: item.handler,
          passedChecks: item.handler.checks.slice()
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
    this.updateTabCounts();
    this.renderResourceList();
    this.updateActionButtons();
    this.log(`Done. ${success} enabled, ${fail} failed.`);
    this.elements.enableAllBtn.disabled = false;
  }

  // ─── Disable Operations ────────────────────────────────────────────────────

  async disableCheck(enabledIndex, checkId) {
    const item = this.enabledResources[enabledIndex];
    if (!item) return;

    const check = item.handler.checks.find(c => c.id === checkId);
    if (!check || !check.disable) return;

    this.log(`⚠️ WARNING: Disabling ${check.disableDescription} on ${item.resource.name}...`);

    try {
      const disableConfig = check.disable(item.resource);
      await this.makeApiCall(disableConfig.url, {
        method: disableConfig.method,
        body: JSON.stringify(disableConfig.body)
      });

      this.log(`✓ Disabled: ${item.resource.name} (${check.disableDescription})`);

      // Move resource from enabled → disabled
      this.enabledResources.splice(enabledIndex, 1);
      this.disabledResources.push({
        resource: item.resource,
        handlerKey: item.handlerKey,
        handler: item.handler,
        failedChecks: [check],
        selected: false,
        working: false
      });

      this.updateTabCounts();
      this.renderResourceList();
    } catch (err) {
      this.logError(`Failed to disable ${item.resource.name}: ${err.message}`);
    }
  }

  // ─── Delete Operations ─────────────────────────────────────────────────────

  openDeleteModal(resource, handlerKey, handler) {
    this.deleteTarget = { resource, handlerKey, handler };
    this.elements.deleteResourceName.textContent = resource.name;
    this.elements.deleteResourceType.textContent = `${handler.icon} ${handler.label}`;
    this.elements.deleteConfirmInput.value = '';
    this.elements.deleteConfirmBtn.disabled = true;
    this.elements.deleteModal.style.display = 'flex';
    this.elements.deleteConfirmInput.focus();
  }

  closeDeleteModal() {
    this.elements.deleteModal.style.display = 'none';
    this.deleteTarget = null;
    this.elements.deleteConfirmInput.value = '';
  }

  validateDeleteInput() {
    if (!this.deleteTarget) return;
    const input = this.elements.deleteConfirmInput.value;
    this.elements.deleteConfirmBtn.disabled = input !== this.deleteTarget.resource.name;
  }

  async confirmDelete() {
    if (!this.deleteTarget) return;
    const { resource, handlerKey, handler } = this.deleteTarget;
    const apiVersion = handler.deleteApiVersion || handler.apiVersion;
    const url = `https://management.azure.com${resource.id}?api-version=${apiVersion}`;

    this.log(`⚠️ Deleting resource: ${resource.name}...`);
    this.closeDeleteModal();

    try {
      await this.makeApiCall(url, { method: 'DELETE' });
      this.log(`✓ Deleted: ${resource.name}`);

      // Remove from whichever list it was in
      const disIdx = this.disabledResources.findIndex(r => r.resource.id === resource.id);
      if (disIdx !== -1) {
        this.disabledResources.splice(disIdx, 1);
      }
      const enIdx = this.enabledResources.findIndex(r => r.resource.id === resource.id);
      if (enIdx !== -1) {
        this.enabledResources.splice(enIdx, 1);
      }

      this.updateTabCounts();
      this.renderResourceList();
      this.updateActionButtons();
    } catch (err) {
      this.logError(`Failed to delete ${resource.name}: ${err.message}`);
    }
  }

  // ─── UI Rendering ──────────────────────────────────────────────────────────

  updateTabCounts() {
    this.elements.disabledCount.textContent = this.disabledResources.length;
    this.elements.enabledCount.textContent = this.enabledResources.length;
  }

  updateActionBarVisibility() {
    if (this.activeTab === 'disabled') {
      this.elements.actionBar.style.display = 'flex';
    } else {
      this.elements.actionBar.style.display = 'none';
      this.elements.selectAllToolbar.style.display = 'none';
    }
    if (this.activeTab !== 'sqlstatus' && this.elements.sqlFilterToolbar) {
      this.elements.sqlFilterToolbar.style.display = 'none';
    }
    // Show/hide Fabric controls
    if (this.elements.fabricControls) {
      this.elements.fabricControls.style.display = this.activeTab === 'fabric' ? '' : 'none';
    }
    // Show/hide Databricks controls
    if (this.elements.databricksControls) {
      this.elements.databricksControls.style.display = this.activeTab === 'databricks' ? '' : 'none';
    }
    // Show/hide Synapse controls
    if (this.elements.synapseControls) {
      this.elements.synapseControls.style.display = this.activeTab === 'synapse' ? '' : 'none';
    }
  }

  renderResourceList() {
    if (this.activeTab === 'sqlstatus') {
      this.renderSqlStatusList();
      return;
    }
    if (this.activeTab === 'policy') {
      this.renderPolicyList();
      return;
    }
    if (this.activeTab === 'fabric') {
      this.renderFabricList();
      return;
    }
    if (this.activeTab === 'databricks') {
      this.renderDatabricksList();
      return;
    }
    if (this.activeTab === 'synapse') {
      this.renderSynapseList();
      return;
    }
    if (this.activeTab === 'costsummary') {
      this.renderCostSummaryList();
      return;
    }
    if (this.activeTab === 'disabled') {
      this.renderDisabledList();
    } else {
      this.renderEnabledList();
    }
  }

  updateSqlDbCount() {
    let databases = this.sqlDatabases || [];
    if (this.serverlessOnly) {
      databases = databases.filter(db => db.isServerless);
    }
    if (this.elements.sqlDbCount) {
      this.elements.sqlDbCount.textContent = databases.length;
    }
  }

  renderSqlStatusList() {
    const container = this.elements.resourceList;

    // Show/hide toolbars
    if (this.elements.sqlFilterToolbar) this.elements.sqlFilterToolbar.style.display = '';
    if (this.elements.selectAllToolbar) this.elements.selectAllToolbar.style.display = 'none';
    if (this.elements.actionBar) this.elements.actionBar.style.display = 'none';

    let databases = this.sqlDatabases || [];
    if (this.serverlessOnly) {
      databases = databases.filter(db => db.isServerless);
    }

    if (databases.length === 0) {
      container.innerHTML = '<div class="empty-state">No SQL databases found. Click refresh to scan.</div>';
      return;
    }

    // Group by server
    const grouped = {};
    for (const db of databases) {
      const key = db.serverName;
      if (!grouped[key]) grouped[key] = { resourceGroup: db.serverResourceGroup, databases: [] };
      grouped[key].databases.push(db);
    }

    let html = '';
    for (const [serverName, group] of Object.entries(grouped)) {
      html += `<div class="sql-server-group">`;
      html += `<div class="sql-server-header">🛢️ ${serverName} <span class="sql-server-rg">(${group.resourceGroup})</span></div>`;

      for (const db of group.databases) {
        const statusClass = db.status.toLowerCase();
        html += `<div class="sql-db-row">`;
        html += `  <span class="sql-db-name">${this.getResourceNameLink(db.dbName, db.dbId)}</span>`;
        html += `  <span class="sql-db-meta">`;
        if (db.isServerless) {
          html += `<span class="serverless-label">serverless</span> `;
        }
        html += `    <span class="sql-sku-badge">${db.skuName}</span>`;
        html += `    <span class="sql-status-badge ${statusClass}">${db.status}</span>`;
        if (db.isServerless) {
          if (db.status === 'Paused') {
            html += `<button class="sql-action-btn sql-resume-btn" data-db-id="${db.dbId}" data-db-name="${db.dbName}" title="Resume database">▶ Resume</button>`;
          } else if (db.status === 'Online') {
            html += `<button class="sql-action-btn sql-pause-btn" data-db-id="${db.dbId}" data-db-name="${db.dbName}" title="Pause database">⏸ Pause</button>`;
          }
        }
        html += `  </span>`;
        html += `</div>`;
      }

      html += `</div>`;
    }

    container.innerHTML = html;
  }

  renderPolicyList() {
    const container = this.elements.resourceList;

    if (this.elements.sqlFilterToolbar) this.elements.sqlFilterToolbar.style.display = 'none';
    if (this.elements.selectAllToolbar) this.elements.selectAllToolbar.style.display = 'none';
    if (this.elements.actionBar) this.elements.actionBar.style.display = 'none';

    if (this.policyDetailAssignment) {
      this.renderPolicyDetailView(container);
      return;
    }

    if (!this.policyData) {
      container.innerHTML = '<div class="empty-state">Click refresh to scan policy compliance.</div>';
      return;
    }

    const { compliancePercentage, totalResources, nonCompliantCount, assignments } = this.policyData;
    let scoreClass = 'good';
    if (compliancePercentage < 70) scoreClass = 'bad';
    else if (compliancePercentage < 90) scoreClass = 'warn';

    let html = `<div class="policy-summary">`;
    html += `<div class="policy-score ${scoreClass}">`;
    html += `<span class="policy-score-number">${compliancePercentage}%</span>`;
    html += `<span class="policy-score-label">Compliant</span>`;
    html += `</div>`;
    html += `<div class="policy-stats">`;
    html += `<span>${totalResources} total resources</span>`;
    html += `<span class="policy-stat-bad">${nonCompliantCount} non-compliant</span>`;
    html += `</div>`;
    html += `</div>`;

    if (assignments.length === 0) {
      html += '<div class="empty-state">All resources are compliant! 🎉</div>';
    } else {
      html += `<div class="policy-list-header">Top Non-Compliant Policies</div>`;

      for (const assignment of assignments) {
        html += `<div class="policy-row" data-assignment-id="${assignment.assignmentId}">`;
        html += `<div class="policy-row-main">`;
        html += `<span class="policy-name">${assignment.policyDefinitionName}</span>`;
        html += `<span class="policy-assignment-name">${assignment.assignmentName}</span>`;
        html += `</div>`;
        html += `<div class="policy-row-meta">`;
        html += `<span class="policy-violation-count">${assignment.nonCompliantResources} violations</span>`;
        html += `<button class="policy-drill-btn" data-assignment-id="${assignment.assignmentId}" title="View affected resources">→</button>`;
        html += `</div>`;
        html += `</div>`;
      }
    }

    container.innerHTML = html;
  }

  renderPolicyDetailView(container) {
    const assignment = this.policyData?.assignments?.find(a => a.assignmentId === this.policyDetailAssignment);
    const assignmentName = assignment?.policyDefinitionName || 'Unknown Policy';
    const remediationUrl = assignment?.assignmentId ? `https://portal.azure.com/#@/resource${assignment.assignmentId}` : '#';

    let html = `<div class="policy-detail-header">`;
    html += `<button class="policy-back-btn" title="Back to policy list">← Back</button>`;
    html += `<span class="policy-detail-title">${assignmentName}</span>`;
    if (assignment?.assignmentId) {
      html += `<a href="${remediationUrl}" target="_blank" rel="noopener noreferrer" class="policy-portal-link" title="Open policy assignment in Azure Portal to remediate">🛠️ Remediate</a>`;
    }
    html += `</div>`;

    if (this.policyDetailLoading) {
      html += '<div class="empty-state">Loading affected resources...</div>';
    } else if (this.policyDetailResources.length === 0) {
      html += '<div class="empty-state">No affected resources found.</div>';
    } else {
      html += `<div class="policy-detail-count">${this.policyDetailResources.length} affected resource(s)</div>`;

      for (const resource of this.policyDetailResources) {
        const portalUrl = `https://portal.azure.com/#@/resource${resource.resourceId}`;
        html += `<div class="policy-resource-row">`;
        html += `<div class="policy-resource-info">`;
        html += `<span class="policy-resource-name">${resource.resourceName}</span>`;
        html += `<span class="policy-resource-type">${resource.resourceType}</span>`;
        html += `<span class="policy-resource-rg">${resource.resourceGroup}</span>`;
        html += `</div>`;
        html += `<div class="policy-resource-actions">`;
        html += `<a href="${portalUrl}" target="_blank" rel="noopener noreferrer" class="policy-portal-link" title="Open in Azure Portal">🌐 Portal</a>`;
        html += `</div>`;
        html += `</div>`;
      }
    }

    container.innerHTML = html;
  }

  renderDisabledList() {
    const container = this.elements.resourceList;
    if (this.elements.sqlFilterToolbar) this.elements.sqlFilterToolbar.style.display = 'none';

    if (this.disabledResources.length === 0) {
      container.innerHTML = '<div class="empty-state">No disabled resources found</div>';
      this.elements.selectAllToolbar.style.display = 'none';
      return;
    }

    // Show select-all toolbar
    this.elements.selectAllToolbar.style.display = 'flex';

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
      const allChecked = group.items.every(i => i.selected);
      const someChecked = group.items.some(i => i.selected);
      const categoryChecked = allChecked ? 'checked' : '';

      html += `<div class="resource-group-header">
        <input type="checkbox" class="category-checkbox" data-handler-key="${key}" ${categoryChecked} title="Select all ${group.handler.label}">
        ${group.handler.icon} ${group.handler.label}
        <span class="badge">${group.items.length}</span>
      </div>`;

      for (const item of group.items) {
        const rg = this.extractResourceGroup(item.resource.id);
        const working = item.working ? 'working' : '';
        const checked = item.selected ? 'checked' : '';
        const issuesHtml = item.failedChecks.map(c => c.description).join(', ');

        const connStrBtn = RESOURCE_HANDLERS[key]?.getConnectionString
          ? `<button class="conn-str-btn" data-resource-id="${item.resource.id}" data-handler-key="${key}" title="Copy connection string">📋</button>`
          : '';

        html += `<div class="resource-item">
          <input type="checkbox" class="checkbox" data-index="${item.index}" data-handler-key="${key}" ${checked} ${item.working ? 'disabled' : ''}>
          <div class="resource-info">
            <div class="resource-name" title="${item.resource.name}">${this.getResourceNameLink(item.resource.name, item.resource.id)}</div>
            <div class="resource-detail">${rg} • ${item.resource.location || 'N/A'}</div>
            <div class="resource-issue">${issuesHtml}</div>
          </div>
          ${connStrBtn}
          <button class="enable-btn ${working}" data-index="${item.index}" ${item.working ? 'disabled' : ''}>
            ${item.working ? '...' : 'Enable'}
          </button>
          <button class="btn-delete" data-index="${item.index}" title="Delete resource">🗑️</button>
        </div>`;
      }
    }

    container.innerHTML = html;

    // Set indeterminate state for category checkboxes after rendering
    container.querySelectorAll('.category-checkbox').forEach(cb => {
      const key = cb.dataset.handlerKey;
      const groupItems = this.disabledResources.filter(r => r.handlerKey === key);
      const checkedCount = groupItems.filter(r => r.selected).length;
      if (checkedCount > 0 && checkedCount < groupItems.length) {
        cb.indeterminate = true;
      }
    });

    // Attach event listeners
    container.querySelectorAll('.enable-btn').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const idx = parseInt(ev.target.dataset.index, 10);
        this.enableSingle(idx);
      });
    });

    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const idx = parseInt(ev.currentTarget.dataset.index, 10);
        const item = this.disabledResources[idx];
        if (item) {
          this.openDeleteModal(item.resource, item.handlerKey, item.handler);
        }
      });
    });

    container.querySelectorAll('.checkbox').forEach(cb => {
      cb.addEventListener('change', (ev) => {
        ev.stopPropagation();
        const idx = parseInt(ev.target.dataset.index, 10);
        const handlerKey = ev.target.dataset.handlerKey;
        this.disabledResources[idx].selected = ev.target.checked;
        this.updateCategoryCheckbox(handlerKey);
        this.updateSelectAllCheckbox();
        this.updateActionButtons();
      });
    });

    // Category checkbox listeners
    container.querySelectorAll('.category-checkbox').forEach(cb => {
      cb.addEventListener('change', (ev) => {
        ev.stopPropagation();
        const key = ev.target.dataset.handlerKey;
        this.onCategoryCheckboxChange(key, ev.target.checked);
      });
    });

    this.updateSelectAllCheckbox();
    this.updateActionButtons();
  }

  onSelectAllChange(checked) {
    this.disabledResources.forEach(item => {
      if (!item.working) {
        item.selected = checked;
      }
    });
    // Update all individual checkboxes
    const container = this.elements.resourceList;
    container.querySelectorAll('.checkbox').forEach(cb => {
      const idx = parseInt(cb.dataset.index, 10);
      if (!this.disabledResources[idx].working) {
        cb.checked = checked;
      }
    });
    // Update all category checkboxes
    container.querySelectorAll('.category-checkbox').forEach(cb => {
      cb.checked = checked;
      cb.indeterminate = false;
    });
    this.updateActionButtons();
  }

  onCategoryCheckboxChange(handlerKey, checked) {
    const container = this.elements.resourceList;
    // Update data model
    this.disabledResources.forEach((item, idx) => {
      if (item.handlerKey === handlerKey && !item.working) {
        item.selected = checked;
      }
    });
    // Update individual checkboxes in this category
    container.querySelectorAll(`.checkbox[data-handler-key="${handlerKey}"]`).forEach(cb => {
      const idx = parseInt(cb.dataset.index, 10);
      if (!this.disabledResources[idx].working) {
        cb.checked = checked;
      }
    });
    // Update the category checkbox itself (clear indeterminate)
    const categoryCb = container.querySelector(`.category-checkbox[data-handler-key="${handlerKey}"]`);
    if (categoryCb) {
      categoryCb.indeterminate = false;
    }
    this.updateSelectAllCheckbox();
    this.updateActionButtons();
  }

  updateCategoryCheckbox(handlerKey) {
    const container = this.elements.resourceList;
    const categoryCb = container.querySelector(`.category-checkbox[data-handler-key="${handlerKey}"]`);
    if (!categoryCb) return;

    const groupItems = this.disabledResources.filter(r => r.handlerKey === handlerKey);
    const checkedCount = groupItems.filter(r => r.selected).length;

    if (checkedCount === 0) {
      categoryCb.checked = false;
      categoryCb.indeterminate = false;
    } else if (checkedCount === groupItems.length) {
      categoryCb.checked = true;
      categoryCb.indeterminate = false;
    } else {
      categoryCb.checked = false;
      categoryCb.indeterminate = true;
    }
  }

  updateSelectAllCheckbox() {
    const cb = this.elements.selectAllCheckbox;
    if (!cb) return;

    const total = this.disabledResources.length;
    const checkedCount = this.disabledResources.filter(r => r.selected).length;

    if (checkedCount === 0) {
      cb.checked = false;
      cb.indeterminate = false;
    } else if (checkedCount === total) {
      cb.checked = true;
      cb.indeterminate = false;
    } else {
      cb.checked = false;
      cb.indeterminate = true;
    }
  }

  renderEnabledList() {
    const container = this.elements.resourceList;
    if (this.elements.sqlFilterToolbar) this.elements.sqlFilterToolbar.style.display = 'none';

    if (this.enabledResources.length === 0) {
      container.innerHTML = '<div class="empty-state">No enabled resources found</div>';
      return;
    }

    // Group by handler type
    const groups = {};
    this.enabledResources.forEach((item, idx) => {
      const key = item.handlerKey;
      if (!groups[key]) {
        groups[key] = { handler: item.handler, items: [] };
      }
      groups[key].items.push({ ...item, index: idx });
    });

    let html = '';
    for (const [key, group] of Object.entries(groups)) {
      html += `<div class="resource-group-header resource-group-header--enabled">
        ${group.handler.icon} ${group.handler.label}
        <span class="badge badge--enabled">${group.items.length}</span>
      </div>`;

      for (const item of group.items) {
        const rg = this.extractResourceGroup(item.resource.id);
        const badgesHtml = item.passedChecks.map(c =>
          `<span class="status-badge enabled">${c.id}</span>`
        ).join(' ');

        // Build disable dropdown options
        const disableOptions = item.handler.checks.map(c =>
          `<label class="disable-option" data-index="${item.index}" data-check-id="${c.id}">
            <span>${c.disableDescription}</span>
          </label>`
        ).join('');

        const connStrBtn = RESOURCE_HANDLERS[key]?.getConnectionString
          ? `<button class="conn-str-btn" data-resource-id="${item.resource.id}" data-handler-key="${key}" title="Copy connection string">📋</button>`
          : '';

        html += `<div class="resource-item resource-item--enabled">
          <div class="resource-info">
            <div class="resource-name" title="${item.resource.name}">${item.handler.icon} ${this.getResourceNameLink(item.resource.name, item.resource.id)}</div>
            <div class="resource-detail">${rg} • ${item.resource.location || 'N/A'}</div>
            <div class="resource-badges">${badgesHtml}</div>
          </div>
          <div class="resource-actions-enabled">
            ${connStrBtn}
            <div class="disable-dropdown-wrapper">
              <button class="btn-disable-toggle" data-index="${item.index}">Disable ▾</button>
              <div class="disable-dropdown" data-index="${item.index}" style="display:none">
                ${disableOptions}
              </div>
            </div>
            <button class="btn-delete" data-index="${item.index}" title="Delete resource">🗑️</button>
          </div>
        </div>`;
      }
    }

    container.innerHTML = html;

    // Attach disable dropdown toggle listeners
    container.querySelectorAll('.btn-disable-toggle').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const idx = ev.currentTarget.dataset.index;
        const dropdown = container.querySelector(`.disable-dropdown[data-index="${idx}"]`);
        // Close all other dropdowns
        container.querySelectorAll('.disable-dropdown').forEach(d => {
          if (d !== dropdown) d.style.display = 'none';
        });
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      });
    });

    // Attach disable option listeners
    container.querySelectorAll('.disable-option').forEach(opt => {
      opt.addEventListener('click', (ev) => {
        const idx = parseInt(ev.currentTarget.dataset.index, 10);
        const checkId = ev.currentTarget.dataset.checkId;
        this.disableCheck(idx, checkId);
      });
    });

    // Attach delete listeners
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const idx = parseInt(ev.currentTarget.dataset.index, 10);
        const item = this.enabledResources[idx];
        if (item) {
          this.openDeleteModal(item.resource, item.handlerKey, item.handler);
        }
      });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      container.querySelectorAll('.disable-dropdown').forEach(d => {
        d.style.display = 'none';
      });
    }, { once: true });
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
        return retryResp.status === 204 || retryResp.status === 200 && retryResp.headers.get('content-length') === '0' ? {} : await retryResp.json().catch(() => ({}));
      }

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`API error ${resp.status}: ${err}`);
      }

      if (resp.status === 204 || resp.status === 202) return {};
      return await resp.json().catch(() => ({}));
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

  // ─── Azure Portal Hyperlinks ────────────────────────────────────────────────

  getResourceNameLink(name, resourceId) {
    if (!resourceId) return name;
    const portalUrl = `https://portal.azure.com/#@${encodeURIComponent(this.tenantId)}/resource${resourceId}`;
    return `<a href="${portalUrl}" target="_blank" title="Open in Azure Portal">${name}</a>`;
  }

  // ─── Cost Summary ──────────────────────────────────────────────────────────

  getTotalCost() {
    let total = 0;
    for (const entry of this.costSummaryData) {
      total += entry.cost || 0;
    }
    return total;
  }

  async fetchCostSummary() {
    if (!this.selectedSubscription) return;

    try {
      this.debugLog('Fetching cost summary...');
      const subscriptionId = this.selectedSubscription.subscriptionId;
      const url = `${this.baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;

      const body = JSON.stringify({
        type: 'ActualCost',
        timeframe: 'MonthToDate',
        dataset: {
          granularity: 'None',
          aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
          grouping: [
            { type: 'Dimension', name: 'ResourceGroupName' },
            { type: 'Dimension', name: 'ServiceName' },
            { type: 'Dimension', name: 'ResourceId' }
          ]
        }
      });

      const data = await this.makeApiCall(url, { method: 'POST', body });

      this.costSummaryData = [];
      if (data.properties?.rows) {
        for (const row of data.properties.rows) {
          const cost = row[0];
          const resourceGroup = row[1] || 'Unknown';
          const serviceName = row[2] || 'Unknown';
          const resourceId = row[3] || '';
          const currency = row[4] || 'USD';
          if (cost > 0) {
            // Extract resource name from resourceId (last segment)
            const segments = resourceId.split('/');
            const resourceName = segments[segments.length - 1] || resourceId;
            this.costSummaryData.push({ resourceGroup, serviceName, resourceName, resourceId, cost, currency });
          }
        }
      }

      // Sort by cost descending
      this.costSummaryData.sort((a, b) => b.cost - a.cost);

      this.debugLog(`Cost summary: ${this.costSummaryData.length} items, total $${this.getTotalCost().toFixed(2)}`);

      if (this.activeTab === 'costsummary') {
        this.renderResourceList();
      }
    } catch (err) {
      this.debugLog(`Cost summary fetch failed (non-critical): ${err.message}`);
    }
  }

  renderCostSummaryList() {
    const container = this.elements.resourceList;

    // Hide other toolbars
    if (this.elements.sqlFilterToolbar) this.elements.sqlFilterToolbar.style.display = 'none';
    if (this.elements.selectAllToolbar) this.elements.selectAllToolbar.style.display = 'none';
    if (this.elements.actionBar) this.elements.actionBar.style.display = 'none';

    const total = this.getTotalCost();
    const totalFormatted = total < 100 ? `$${total.toFixed(2)}` : `$${Math.round(total).toLocaleString()}`;

    // Budget indicator color
    let indicatorClass = 'green';
    if (total > this.budget) {
      indicatorClass = 'red';
    } else if (total >= this.budget - 100) {
      indicatorClass = 'yellow';
    }

    // Budget header
    let html = `<div class="cost-summary-header">
      <span class="cost-summary-total">MTD: ${totalFormatted}</span>
      <span class="cost-summary-budget">
        / $<input type="number" id="costBudgetInput" value="${this.budget}" min="0" step="100" title="Monthly budget"> budget
        <span class="cost-summary-indicator ${indicatorClass}"></span>
      </span>
    </div>`;

    if (this.costSummaryData.length === 0) {
      html += '<div class="empty-state">No cost data available. Click refresh to scan.</div>';
      container.innerHTML = html;
      this.attachBudgetInputListener();
      return;
    }

    // Group by resource group
    const grouped = {};
    for (const item of this.costSummaryData) {
      if (!grouped[item.resourceGroup]) grouped[item.resourceGroup] = [];
      grouped[item.resourceGroup].push(item);
    }

    // Sort RGs by total cost descending
    const sortedRGs = Object.entries(grouped).sort((a, b) => {
      const totalA = a[1].reduce((sum, i) => sum + i.cost, 0);
      const totalB = b[1].reduce((sum, i) => sum + i.cost, 0);
      return totalB - totalA;
    });

    for (const [rgName, items] of sortedRGs) {
      const rgTotal = items.reduce((sum, i) => sum + i.cost, 0);
      const rgTotalFormatted = rgTotal < 100 ? `$${rgTotal.toFixed(2)}` : `$${Math.round(rgTotal).toLocaleString()}`;

      html += `<div class="cost-rg-header">
        <span class="rg-label">📦 ${rgName}</span>
        <span class="rg-total">${rgTotalFormatted}</span>
      </div>`;

      // Sort items within RG by cost descending
      items.sort((a, b) => b.cost - a.cost);

      for (const item of items) {
        const costFormatted = item.cost < 1 ? `$${item.cost.toFixed(2)}` : item.cost < 100 ? `$${item.cost.toFixed(2)}` : `$${Math.round(item.cost).toLocaleString()}`;
        const portalUrl = item.resourceId
          ? `https://portal.azure.com/#@${encodeURIComponent(this.tenantId)}/resource${item.resourceId}`
          : '';
        const nameHtml = portalUrl
          ? `<a href="${portalUrl}" target="_blank" title="Open in Azure Portal">${item.resourceName}</a>`
          : item.resourceName;

        html += `<div class="cost-row">
          <span class="cost-row-service">${item.serviceName}</span>
          <span class="cost-row-name">${nameHtml}</span>
          <span class="cost-row-amount">${costFormatted}</span>
        </div>`;
      }
    }

    // Total row
    html += `<div class="cost-total-row">
      <span class="cost-total-label">TOTAL</span>
      <span class="cost-total-amount">${totalFormatted}</span>
    </div>`;

    container.innerHTML = html;
    this.attachBudgetInputListener();
  }

  attachBudgetInputListener() {
    const input = document.getElementById('costBudgetInput');
    if (input) {
      input.addEventListener('change', () => {
        this.budget = parseFloat(input.value) || 0;
        chrome.storage.local.set({ budget: this.budget });
        this.renderCostSummaryList();
      });
    }
  }

  // ─── Fabric Capacity Management ────────────────────────────────────────────

  async scanFabricCapacities() {
    if (!this.subscriptions || this.subscriptions.length === 0) return;

    try {
      this.debugLog('Scanning Fabric capacities...');
      this.fabricCapacities = [];

      for (const sub of this.subscriptions) {
        try {
          const url = `${this.baseUrl}/subscriptions/${sub.subscriptionId}/providers/Microsoft.Fabric/capacities?api-version=${this.fabricApiVersion}`;
          const data = await this.makeApiCall(url, { method: 'GET' });
          const capacities = data.value || [];
          for (const cap of capacities) {
            this.fabricCapacities.push({
              ...cap,
              subscriptionId: sub.subscriptionId,
              subscriptionName: sub.displayName
            });
          }
        } catch (err) {
          if (!err.message.includes('404') && !err.message.includes('ResourceProviderNotRegistered')) {
            this.debugLog(`Fabric scan error for ${sub.displayName}: ${err.message}`);
          }
        }
      }

      this.debugLog(`Found ${this.fabricCapacities.length} Fabric capacities.`);
      if (this.elements.fabricCount) {
        this.elements.fabricCount.textContent = this.fabricCapacities.length;
      }

      if (this.activeTab === 'fabric') {
        this.renderResourceList();
      }
    } catch (err) {
      this.debugLog(`Fabric scan failed: ${err.message}`);
    }
  }

  async fetchFabricCosts() {
    if (this.fabricCapacities.length === 0) return;

    try {
      const subscriptionIds = [...new Set(this.fabricCapacities.map(c => c.subscriptionId))];

      for (const subscriptionId of subscriptionIds) {
        try {
          const url = `${this.baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;
          const body = JSON.stringify({
            type: 'ActualCost',
            timeframe: 'MonthToDate',
            dataset: {
              granularity: 'None',
              aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
              grouping: [{ type: 'Dimension', name: 'ResourceId' }]
            }
          });
          const data = await this.makeApiCall(url, { method: 'POST', body });
          if (data.properties?.rows) {
            for (const row of data.properties.rows) {
              const cost = row[0];
              const resourceId = row[1];
              const currency = row[2] || 'USD';
              if (resourceId && cost > 0) {
                this.fabricCosts[resourceId.toLowerCase()] = { cost, currency };
              }
            }
          }
        } catch (err) {
          this.debugLog(`Fabric cost fetch failed for sub ${subscriptionId}: ${err.message}`);
        }
      }
    } catch (err) {
      this.debugLog(`Fabric cost fetch failed: ${err.message}`);
    }
  }

  renderFabricList() {
    const container = this.elements.resourceList;

    // Hide other toolbars
    if (this.elements.sqlFilterToolbar) this.elements.sqlFilterToolbar.style.display = 'none';
    if (this.elements.selectAllToolbar) this.elements.selectAllToolbar.style.display = 'none';
    if (this.elements.actionBar) this.elements.actionBar.style.display = 'none';

    if (this.fabricCapacities.length === 0) {
      container.innerHTML = '<div class="empty-state">No Fabric capacities found. Click refresh to scan.</div>';
      this.updateFabricButtons();
      return;
    }

    // Group by subscription
    const grouped = {};
    this.fabricCapacities.forEach((cap, idx) => {
      const key = cap.subscriptionName || cap.subscriptionId;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ cap, idx });
    });

    let html = '';
    for (const [subName, items] of Object.entries(grouped)) {
      html += `<div class="fabric-category-header">
        <span class="category-label">📦 ${subName}</span>
        <span class="category-count">${items.length}</span>
      </div>`;

      for (const { cap, idx } of items) {
        const state = cap.properties?.state || 'Unknown';
        const statusClass = state === 'Active' ? 'running' : 'stopped';
        const statusLabel = state === 'Active' ? 'Running' : state;
        const sku = cap.sku?.name || 'N/A';
        const selected = this.fabricSelectedIndices.has(idx) || this.fabricSelectedIndex === idx;
        const selectedClass = selected ? 'selected' : '';

        html += `<div class="fabric-capacity-item ${selectedClass}" data-index="${idx}">
          <input type="checkbox" class="capacity-checkbox" data-index="${idx}" ${this.fabricSelectedIndices.has(idx) ? 'checked' : ''}>
          <span class="fabric-capacity-name">${this.getResourceNameLink(cap.name, cap.id)}</span>
          <span class="fabric-capacity-sku">${sku}</span>
          <span class="fabric-capacity-status ${statusClass}">${statusLabel}</span>
        </div>`;
      }
    }

    container.innerHTML = html;

    // Attach event listeners for capacity item clicks
    container.querySelectorAll('.fabric-capacity-item').forEach(el => {
      el.addEventListener('click', (ev) => {
        if (ev.target.closest('a') || ev.target.closest('.capacity-checkbox')) return;
        const idx = parseInt(el.dataset.index, 10);
        this.onFabricCapacityClick(idx);
      });
    });

    // Checkbox listeners
    container.querySelectorAll('.capacity-checkbox').forEach(cb => {
      cb.addEventListener('change', (ev) => {
        const idx = parseInt(ev.target.dataset.index, 10);
        if (ev.target.checked) {
          this.fabricSelectedIndices.add(idx);
        } else {
          this.fabricSelectedIndices.delete(idx);
        }
        this.updateFabricButtons();
      });
    });

    this.updateFabricButtons();
  }

  onFabricCapacityClick(idx) {
    this.fabricSelectedIndex = idx;
    this.fabricSelectedIndices.clear();
    this.fabricSelectedIndices.add(idx);

    // Update SKU dropdown
    const cap = this.fabricCapacities[idx];
    if (cap) {
      this.loadFabricSkus(cap);
    }

    this.renderFabricList();
    this.updateFabricButtons();
  }

  loadFabricSkus(capacity) {
    const skus = ['F2', 'F4', 'F8', 'F16', 'F32', 'F64', 'F128', 'F256', 'F512', 'F1024', 'F2048'];
    const currentSku = capacity.sku?.name || '';
    const e = this.elements;

    e.fabricSkuSelect.innerHTML = '';
    for (const sku of skus) {
      const opt = document.createElement('option');
      opt.value = sku;
      opt.textContent = sku === currentSku ? `${sku} (current)` : sku;
      if (sku === currentSku) opt.selected = true;
      e.fabricSkuSelect.appendChild(opt);
    }
    e.fabricSkuSelect.disabled = false;
  }

  updateFabricButtons() {
    const e = this.elements;
    const hasSelection = this.fabricSelectedIndices.size > 0 || this.fabricSelectedIndex !== null;
    e.fabricStartBtn.disabled = !hasSelection;
    e.fabricStopBtn.disabled = !hasSelection;
    e.fabricUpdateSkuBtn.disabled = !hasSelection || !e.fabricSkuSelect.value;
  }

  async fabricStartCapacity() {
    await this.performFabricOperation('resume', 'Starting');
  }

  async fabricStopCapacity() {
    await this.performFabricOperation('suspend', 'Stopping');
  }

  async performFabricOperation(operation, operationName) {
    let targetIndices = [...this.fabricSelectedIndices];
    if (targetIndices.length === 0 && this.fabricSelectedIndex !== null) {
      targetIndices = [this.fabricSelectedIndex];
    }
    if (targetIndices.length === 0) return;

    const relevantState = operation === 'resume' ? 'Paused' : 'Active';
    const relevant = targetIndices.filter(idx => {
      const cap = this.fabricCapacities[idx];
      return cap?.properties?.state === relevantState;
    });

    if (relevant.length === 0) {
      this.log(`No capacities in ${relevantState} state to ${operation}`);
      return;
    }

    try {
      this.elements.fabricStartBtn.disabled = true;
      this.elements.fabricStopBtn.disabled = true;
      this.log(`${operationName} ${relevant.length} Fabric capacity${relevant.length > 1 ? 'ies' : ''}...`);

      for (const idx of relevant) {
        const cap = this.fabricCapacities[idx];
        try {
          const url = `${this.baseUrl}${cap.id}/${operation}?api-version=${this.fabricApiVersion}`;
          await this.makeApiCall(url, { method: 'POST' });
          this.log(`✓ ${operationName} initiated for ${cap.name}`);
        } catch (err) {
          this.logError(`Failed to ${operation} ${cap.name}: ${err.message}`);
        }
      }

      // Refresh after delay
      setTimeout(() => this.scanFabricCapacities(), 2000);
    } finally {
      this.updateFabricButtons();
    }
  }

  async fabricUpdateSku() {
    const newSku = this.elements.fabricSkuSelect.value;
    if (!newSku) return;

    let targetIndices = [...this.fabricSelectedIndices];
    if (targetIndices.length === 0 && this.fabricSelectedIndex !== null) {
      targetIndices = [this.fabricSelectedIndex];
    }
    if (targetIndices.length === 0) return;

    try {
      this.elements.fabricUpdateSkuBtn.disabled = true;
      for (const idx of targetIndices) {
        const cap = this.fabricCapacities[idx];
        if (!cap) continue;
        if (cap.sku?.name === newSku) {
          this.log(`${cap.name} already at SKU ${newSku}, skipping.`);
          continue;
        }
        try {
          const url = `${this.baseUrl}${cap.id}?api-version=${this.fabricApiVersion}`;
          const body = JSON.stringify({ sku: { name: newSku, tier: 'Fabric' } });
          await this.makeApiCall(url, { method: 'PATCH', body });
          this.log(`✓ SKU updated to ${newSku} for ${cap.name}`);
        } catch (err) {
          this.logError(`Failed to update SKU for ${cap.name}: ${err.message}`);
        }
      }
      setTimeout(() => this.scanFabricCapacities(), 2000);
    } finally {
      this.updateFabricButtons();
    }
  }

  // ─── Databricks Cluster Management ──────────────────────────────────────────

  async scanDatabricksClusters() {
    if (!this.subscriptions || this.subscriptions.length === 0) return;

    try {
      this.debugLog('Scanning Databricks workspaces and clusters...');
      this.databricksWorkspaces = [];
      this.databricksClusters = [];

      for (const sub of this.subscriptions) {
        try {
          const url = `${this.baseUrl}/subscriptions/${sub.subscriptionId}/providers/Microsoft.Databricks/workspaces?api-version=2024-05-01`;
          const data = await this.makeApiCall(url, { method: 'GET' });
          const workspaces = data.value || [];
          for (const ws of workspaces) {
            ws._subscriptionId = sub.subscriptionId;
            ws._subscriptionName = sub.displayName;
            this.databricksWorkspaces.push(ws);

            // Fetch clusters for this workspace
            const workspaceUrl = ws.properties?.workspaceUrl;
            if (workspaceUrl) {
              try {
                const clustersUrl = `https://${workspaceUrl}/api/2.0/clusters/list`;
                const clusterData = await this.makeDatabricksApiCall(clustersUrl, { method: 'GET' });
                const clusters = clusterData.clusters || [];
                for (const cluster of clusters) {
                  this.databricksClusters.push({
                    cluster,
                    workspace: ws,
                    subscriptionId: sub.subscriptionId,
                    subscriptionName: sub.displayName
                  });
                }
              } catch (clusterErr) {
                this.debugLog(`Failed to list clusters for workspace ${ws.name}: ${clusterErr.message}`);
              }
            }
          }
        } catch (err) {
          if (!err.message.includes('404') && !err.message.includes('ResourceProviderNotRegistered')) {
            this.debugLog(`Databricks scan error for ${sub.displayName}: ${err.message}`);
          }
        }
      }

      this.debugLog(`Found ${this.databricksClusters.length} Databricks clusters across ${this.databricksWorkspaces.length} workspaces.`);
      if (this.elements.databricksCount) {
        this.elements.databricksCount.textContent = this.databricksWorkspaces.length;
      }

      if (this.activeTab === 'databricks') {
        this.renderResourceList();
      }
    } catch (err) {
      this.debugLog(`Databricks scan failed: ${err.message}`);
    }
  }

  async makeDatabricksApiCall(url, options = {}) {
    const token = await this.getDatabricksToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    const resp = await fetch(url, { ...options, headers });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Databricks API ${resp.status}: ${text.substring(0, 200)}`);
    }
    const text = await resp.text();
    return text ? JSON.parse(text) : {};
  }

  async fetchDatabricksCosts() {
    if (this.databricksWorkspaces.length === 0) return;

    try {
      const subscriptionIds = [...new Set(this.databricksWorkspaces.map(ws => ws._subscriptionId))];

      for (const subscriptionId of subscriptionIds) {
        try {
          const url = `${this.baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;
          const body = JSON.stringify({
            type: 'ActualCost',
            timeframe: 'MonthToDate',
            dataset: {
              granularity: 'None',
              aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
              grouping: [{ type: 'Dimension', name: 'ResourceId' }],
              filter: {
                dimensions: {
                  name: 'ResourceType',
                  operator: 'In',
                  values: ['Microsoft.Databricks/workspaces']
                }
              }
            }
          });
          const data = await this.makeApiCall(url, { method: 'POST', body });
          if (data.properties?.rows) {
            for (const row of data.properties.rows) {
              const cost = row[0];
              const resourceId = row[1];
              const currency = row[2] || 'USD';
              if (resourceId && cost > 0) {
                this.databricksCosts[resourceId.toLowerCase()] = { cost, currency };
              }
            }
          }
        } catch (err) {
          this.debugLog(`Databricks cost fetch failed for sub ${subscriptionId}: ${err.message}`);
        }
      }
    } catch (err) {
      this.debugLog(`Databricks cost fetch failed: ${err.message}`);
    }
  }

  renderDatabricksList() {
    const container = this.elements.resourceList;

    // Hide other toolbars
    if (this.elements.sqlFilterToolbar) this.elements.sqlFilterToolbar.style.display = 'none';
    if (this.elements.selectAllToolbar) this.elements.selectAllToolbar.style.display = 'none';
    if (this.elements.actionBar) this.elements.actionBar.style.display = 'none';

    if (this.databricksWorkspaces.length === 0 && this.databricksClusters.length === 0) {
      container.innerHTML = '<div class="empty-state">No Databricks workspaces found. Click refresh to scan.</div>';
      this.updateDatabricksButtons();
      return;
    }

    // Group clusters by workspace, and include workspaces with no clusters
    const grouped = {};
    // First, seed all workspaces
    for (const ws of this.databricksWorkspaces) {
      const key = `${ws.name} (${ws._subscriptionName})`;
      if (!grouped[key]) grouped[key] = { items: [], workspace: ws };
    }
    // Then add clusters
    this.databricksClusters.forEach((entry, idx) => {
      const key = `${entry.workspace.name} (${entry.subscriptionName})`;
      if (!grouped[key]) grouped[key] = { items: [], workspace: entry.workspace };
      grouped[key].items.push({ entry, idx });
    });

    let html = '';
    for (const [label, { items, workspace }] of Object.entries(grouped)) {
      const workspaceUrl = workspace.properties?.workspaceUrl
        ? `https://${workspace.properties.workspaceUrl}`
        : null;
      const portalUrl = `https://portal.azure.com/#@${encodeURIComponent(this.tenantId)}/resource${workspace.id}`;
      const headerLink = workspaceUrl
        ? `<a href="${workspaceUrl}" target="_blank" title="Open Databricks workspace">🔗</a> <a href="${portalUrl}" target="_blank" title="Open in Azure Portal">🌐</a>`
        : `<a href="${portalUrl}" target="_blank" title="Open in Azure Portal">🌐</a>`;

      html += `<div class="compute-category-header">
        <span class="category-label">🔶 ${label} ${headerLink}</span>
        <span class="category-count">${items.length} cluster${items.length !== 1 ? 's' : ''}</span>
      </div>`;

      for (const { entry, idx } of items) {
        const cluster = entry.cluster;
        const state = cluster.state || 'UNKNOWN';
        const statusClass = state === 'RUNNING' ? 'running' : (state === 'PENDING' || state === 'RESTARTING' || state === 'RESIZING') ? 'pending' : 'stopped';
        const statusLabel = state.charAt(0) + state.slice(1).toLowerCase();
        const nodeType = cluster.node_type_id || '';
        const selected = this.databricksSelectedIndices.has(idx) ? 'selected' : '';

        html += `<div class="compute-item ${selected}" data-index="${idx}">
          <input type="checkbox" class="capacity-checkbox" data-index="${idx}" ${this.databricksSelectedIndices.has(idx) ? 'checked' : ''}>
          <span class="compute-item-name" title="${cluster.cluster_name}">${cluster.cluster_name}</span>
          <span class="compute-item-detail">${nodeType}</span>
          <span class="compute-item-status ${statusClass}">${statusLabel}</span>
        </div>`;
      }

      if (items.length === 0) {
        html += `<div class="compute-item"><span class="compute-item-name" style="color:var(--color-neutral-light);font-style:italic;">No clusters provisioned</span></div>`;
      }
    }

    container.innerHTML = html;

    // Event listeners
    container.querySelectorAll('.compute-item').forEach(el => {
      el.addEventListener('click', (ev) => {
        if (ev.target.closest('a') || ev.target.closest('.capacity-checkbox')) return;
        const idx = parseInt(el.dataset.index, 10);
        this.databricksSelectedIndices.clear();
        this.databricksSelectedIndices.add(idx);
        this.renderDatabricksList();
      });
    });

    container.querySelectorAll('.capacity-checkbox').forEach(cb => {
      cb.addEventListener('change', (ev) => {
        const idx = parseInt(ev.target.dataset.index, 10);
        if (ev.target.checked) {
          this.databricksSelectedIndices.add(idx);
        } else {
          this.databricksSelectedIndices.delete(idx);
        }
        this.updateDatabricksButtons();
      });
    });

    this.updateDatabricksButtons();
  }

  updateDatabricksButtons() {
    const e = this.elements;
    const hasSelection = this.databricksSelectedIndices.size > 0;
    e.databricksStartBtn.disabled = !hasSelection;
    e.databricksStopBtn.disabled = !hasSelection;
  }

  async databricksStartCluster() {
    const targetIndices = [...this.databricksSelectedIndices];
    if (targetIndices.length === 0) return;

    const relevant = targetIndices.filter(idx => {
      const entry = this.databricksClusters[idx];
      return entry?.cluster?.state === 'TERMINATED';
    });

    if (relevant.length === 0) {
      this.log('No terminated clusters to start.');
      return;
    }

    try {
      this.elements.databricksStartBtn.disabled = true;
      this.elements.databricksStopBtn.disabled = true;
      this.log(`Starting ${relevant.length} Databricks cluster${relevant.length > 1 ? 's' : ''}...`);

      for (const idx of relevant) {
        const entry = this.databricksClusters[idx];
        const workspaceUrl = entry.workspace.properties?.workspaceUrl;
        try {
          const url = `https://${workspaceUrl}/api/2.0/clusters/start`;
          await this.makeDatabricksApiCall(url, {
            method: 'POST',
            body: JSON.stringify({ cluster_id: entry.cluster.cluster_id })
          });
          this.log(`✓ Start initiated for ${entry.cluster.cluster_name}`);
        } catch (err) {
          this.logError(`Failed to start ${entry.cluster.cluster_name}: ${err.message}`);
        }
      }

      setTimeout(() => this.scanDatabricksClusters(), 3000);
    } finally {
      this.updateDatabricksButtons();
    }
  }

  async databricksStopCluster() {
    const targetIndices = [...this.databricksSelectedIndices];
    if (targetIndices.length === 0) return;

    const relevant = targetIndices.filter(idx => {
      const entry = this.databricksClusters[idx];
      return entry?.cluster?.state === 'RUNNING' || entry?.cluster?.state === 'PENDING';
    });

    if (relevant.length === 0) {
      this.log('No running clusters to stop.');
      return;
    }

    try {
      this.elements.databricksStartBtn.disabled = true;
      this.elements.databricksStopBtn.disabled = true;
      this.log(`Stopping ${relevant.length} Databricks cluster${relevant.length > 1 ? 's' : ''}...`);

      for (const idx of relevant) {
        const entry = this.databricksClusters[idx];
        const workspaceUrl = entry.workspace.properties?.workspaceUrl;
        try {
          const url = `https://${workspaceUrl}/api/2.0/clusters/delete`;
          await this.makeDatabricksApiCall(url, {
            method: 'POST',
            body: JSON.stringify({ cluster_id: entry.cluster.cluster_id })
          });
          this.log(`✓ Stop initiated for ${entry.cluster.cluster_name}`);
        } catch (err) {
          this.logError(`Failed to stop ${entry.cluster.cluster_name}: ${err.message}`);
        }
      }

      setTimeout(() => this.scanDatabricksClusters(), 3000);
    } finally {
      this.updateDatabricksButtons();
    }
  }

  toggleDatabricksCreateForm() {
    const form = this.elements.databricksCreateForm;
    if (form.style.display === 'none') {
      form.style.display = '';
      this.elements.dbClusterName.value = '';
      this.elements.dbWorkerCount.value = '2';
      this.elements.dbClusterName.focus();
    } else {
      form.style.display = 'none';
    }
  }

  hideDatabricksCreateForm() {
    this.elements.databricksCreateForm.style.display = 'none';
  }

  getSelectedDatabricksWorkspace() {
    // Use the workspace of the first selected cluster, or the first workspace
    if (this.databricksSelectedIndices.size > 0) {
      const idx = [...this.databricksSelectedIndices][0];
      const entry = this.databricksClusters[idx];
      if (entry?.workspace) return entry.workspace;
    }
    // Fall back to first workspace
    return this.databricksWorkspaces[0] || null;
  }

  async databricksCreateCluster() {
    const workspace = this.getSelectedDatabricksWorkspace();
    if (!workspace) {
      this.logError('No Databricks workspace available. Please refresh first.');
      return;
    }

    const clusterName = this.elements.dbClusterName.value.trim();
    if (!clusterName) {
      this.logError('Please enter a cluster name.');
      this.elements.dbClusterName.focus();
      return;
    }

    const nodeType = this.elements.dbNodeType.value;
    const numWorkers = parseInt(this.elements.dbWorkerCount.value, 10) || 2;
    const workspaceUrl = workspace.properties?.workspaceUrl;

    if (!workspaceUrl) {
      this.logError('Workspace URL not available.');
      return;
    }

    try {
      this.elements.databricksCreateSubmitBtn.disabled = true;
      this.log(`Creating cluster "${clusterName}" in ${workspace.name}...`);

      const url = `https://${workspaceUrl}/api/2.0/clusters/create`;
      const body = JSON.stringify({
        cluster_name: clusterName,
        spark_version: '15.4.x-scala2.12',
        node_type_id: nodeType,
        num_workers: numWorkers,
        autotermination_minutes: 120
      });

      await this.makeDatabricksApiCall(url, { method: 'POST', body });
      this.log(`✓ Cluster "${clusterName}" created successfully.`);
      this.hideDatabricksCreateForm();

      setTimeout(() => this.scanDatabricksClusters(), 2000);
    } catch (err) {
      this.logError(`Failed to create cluster: ${err.message}`);
    } finally {
      this.elements.databricksCreateSubmitBtn.disabled = false;
    }
  }

  // ─── Synapse Pool Management ────────────────────────────────────────────────

  async scanSynapsePools() {
    if (!this.subscriptions || this.subscriptions.length === 0) return;

    try {
      this.debugLog('Scanning Synapse workspaces and dedicated pools...');
      this.synapseWorkspaces = [];
      this.synapsePools = [];

      for (const sub of this.subscriptions) {
        try {
          const url = `${this.baseUrl}/subscriptions/${sub.subscriptionId}/providers/Microsoft.Synapse/workspaces?api-version=2021-06-01`;
          const data = await this.makeApiCall(url, { method: 'GET' });
          const workspaces = data.value || [];
          for (const ws of workspaces) {
            ws._subscriptionId = sub.subscriptionId;
            ws._subscriptionName = sub.displayName;
            this.synapseWorkspaces.push(ws);

            // Fetch dedicated SQL pools for this workspace
            try {
              const poolsUrl = `${this.baseUrl}${ws.id}/sqlPools?api-version=2021-06-01`;
              const poolData = await this.makeApiCall(poolsUrl, { method: 'GET' });
              const pools = poolData.value || [];
              for (const pool of pools) {
                this.synapsePools.push({
                  pool,
                  workspace: ws,
                  subscriptionId: sub.subscriptionId,
                  subscriptionName: sub.displayName
                });
              }
            } catch (poolErr) {
              this.debugLog(`Failed to list pools for workspace ${ws.name}: ${poolErr.message}`);
            }
          }
        } catch (err) {
          if (!err.message.includes('404') && !err.message.includes('ResourceProviderNotRegistered')) {
            this.debugLog(`Synapse scan error for ${sub.displayName}: ${err.message}`);
          }
        }
      }

      this.debugLog(`Found ${this.synapsePools.length} Synapse dedicated pools across ${this.synapseWorkspaces.length} workspaces.`);
      if (this.elements.synapseCount) {
        this.elements.synapseCount.textContent = this.synapseWorkspaces.length;
      }

      if (this.activeTab === 'synapse') {
        this.renderResourceList();
      }
    } catch (err) {
      this.debugLog(`Synapse scan failed: ${err.message}`);
    }
  }

  async fetchSynapseCosts() {
    if (this.synapseWorkspaces.length === 0) return;

    try {
      const subscriptionIds = [...new Set(this.synapseWorkspaces.map(ws => ws._subscriptionId))];

      for (const subscriptionId of subscriptionIds) {
        try {
          const url = `${this.baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;
          const body = JSON.stringify({
            type: 'ActualCost',
            timeframe: 'MonthToDate',
            dataset: {
              granularity: 'None',
              aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
              grouping: [{ type: 'Dimension', name: 'ResourceId' }],
              filter: {
                dimensions: {
                  name: 'ResourceType',
                  operator: 'In',
                  values: ['Microsoft.Synapse/workspaces', 'Microsoft.Synapse/workspaces/sqlPools']
                }
              }
            }
          });
          const data = await this.makeApiCall(url, { method: 'POST', body });
          if (data.properties?.rows) {
            for (const row of data.properties.rows) {
              const cost = row[0];
              const resourceId = row[1];
              const currency = row[2] || 'USD';
              if (resourceId && cost > 0) {
                this.synapseCosts[resourceId.toLowerCase()] = { cost, currency };
              }
            }
          }
        } catch (err) {
          this.debugLog(`Synapse cost fetch failed for sub ${subscriptionId}: ${err.message}`);
        }
      }
    } catch (err) {
      this.debugLog(`Synapse cost fetch failed: ${err.message}`);
    }
  }

  renderSynapseList() {
    const container = this.elements.resourceList;

    // Hide other toolbars
    if (this.elements.sqlFilterToolbar) this.elements.sqlFilterToolbar.style.display = 'none';
    if (this.elements.selectAllToolbar) this.elements.selectAllToolbar.style.display = 'none';
    if (this.elements.actionBar) this.elements.actionBar.style.display = 'none';

    if (this.synapseWorkspaces.length === 0 && this.synapsePools.length === 0) {
      container.innerHTML = '<div class="empty-state">No Synapse workspaces found. Click refresh to scan.</div>';
      this.updateSynapseButtons();
      return;
    }

    // Group pools by workspace, and include workspaces with no pools
    const grouped = {};
    // First, seed all workspaces
    for (const ws of this.synapseWorkspaces) {
      const key = `${ws.name} (${ws._subscriptionName})`;
      if (!grouped[key]) grouped[key] = { items: [], workspace: ws };
    }
    // Then add pools
    this.synapsePools.forEach((entry, idx) => {
      const key = `${entry.workspace.name} (${entry.subscriptionName})`;
      if (!grouped[key]) grouped[key] = { items: [], workspace: entry.workspace };
      grouped[key].items.push({ entry, idx });
    });

    let html = '';
    for (const [label, { items, workspace }] of Object.entries(grouped)) {
      const portalUrl = `https://portal.azure.com/#@${encodeURIComponent(this.tenantId)}/resource${workspace.id}`;
      const synapseStudioUrl = workspace.properties?.connectivityEndpoints?.web || null;
      const headerLink = synapseStudioUrl
        ? `<a href="${synapseStudioUrl}" target="_blank" title="Open Synapse Studio">🔗</a> <a href="${portalUrl}" target="_blank" title="Open in Azure Portal">🌐</a>`
        : `<a href="${portalUrl}" target="_blank" title="Open in Azure Portal">🌐</a>`;

      html += `<div class="compute-category-header">
        <span class="category-label">🔷 ${label} ${headerLink}</span>
        <span class="category-count">${items.length} pool${items.length !== 1 ? 's' : ''}</span>
      </div>`;

      for (const { entry, idx } of items) {
        const pool = entry.pool;
        const state = pool.properties?.status || 'Unknown';
        const statusClass = state === 'Online' ? 'running' : (state === 'Pausing' || state === 'Resuming') ? 'pending' : 'stopped';
        const statusLabel = state;
        const sku = pool.sku?.name || '';
        const selected = this.synapseSelectedIndices.has(idx) ? 'selected' : '';

        const poolPortalUrl = `https://portal.azure.com/#@${encodeURIComponent(this.tenantId)}/resource${pool.id}`;

        html += `<div class="compute-item ${selected}" data-index="${idx}">
          <input type="checkbox" class="capacity-checkbox" data-index="${idx}" ${this.synapseSelectedIndices.has(idx) ? 'checked' : ''}>
          <span class="compute-item-name"><a href="${poolPortalUrl}" target="_blank" title="Open in Azure Portal">${pool.name}</a></span>
          <span class="compute-item-detail">${sku}</span>
          <span class="compute-item-status ${statusClass}">${statusLabel}</span>
        </div>`;
      }

      if (items.length === 0) {
        html += `<div class="compute-item"><span class="compute-item-name" style="color:var(--color-neutral-light);font-style:italic;">No dedicated pools provisioned</span></div>`;
      }
    }

    container.innerHTML = html;

    // Event listeners
    container.querySelectorAll('.compute-item').forEach(el => {
      el.addEventListener('click', (ev) => {
        if (ev.target.closest('a') || ev.target.closest('.capacity-checkbox')) return;
        const idx = parseInt(el.dataset.index, 10);
        this.synapseSelectedIndices.clear();
        this.synapseSelectedIndices.add(idx);
        this.renderSynapseList();
      });
    });

    container.querySelectorAll('.capacity-checkbox').forEach(cb => {
      cb.addEventListener('change', (ev) => {
        const idx = parseInt(ev.target.dataset.index, 10);
        if (ev.target.checked) {
          this.synapseSelectedIndices.add(idx);
        } else {
          this.synapseSelectedIndices.delete(idx);
        }
        this.updateSynapseButtons();
      });
    });

    this.updateSynapseButtons();
  }

  updateSynapseButtons() {
    const e = this.elements;
    const hasSelection = this.synapseSelectedIndices.size > 0;
    e.synapseResumeBtn.disabled = !hasSelection;
    e.synapsePauseBtn.disabled = !hasSelection;
  }

  async synapseResumePool() {
    const targetIndices = [...this.synapseSelectedIndices];
    if (targetIndices.length === 0) return;

    const relevant = targetIndices.filter(idx => {
      const entry = this.synapsePools[idx];
      return entry?.pool?.properties?.status === 'Paused';
    });

    if (relevant.length === 0) {
      this.log('No paused pools to resume.');
      return;
    }

    try {
      this.elements.synapseResumeBtn.disabled = true;
      this.elements.synapsePauseBtn.disabled = true;
      this.log(`Resuming ${relevant.length} Synapse pool${relevant.length > 1 ? 's' : ''}...`);

      for (const idx of relevant) {
        const entry = this.synapsePools[idx];
        try {
          const url = `${this.baseUrl}${entry.pool.id}/resume?api-version=2021-06-01`;
          await this.makeApiCall(url, { method: 'POST' });
          this.log(`✓ Resume initiated for ${entry.pool.name}`);
        } catch (err) {
          this.logError(`Failed to resume ${entry.pool.name}: ${err.message}`);
        }
      }

      setTimeout(() => this.scanSynapsePools(), 3000);
    } finally {
      this.updateSynapseButtons();
    }
  }

  async synapsePausePool() {
    const targetIndices = [...this.synapseSelectedIndices];
    if (targetIndices.length === 0) return;

    const relevant = targetIndices.filter(idx => {
      const entry = this.synapsePools[idx];
      return entry?.pool?.properties?.status === 'Online';
    });

    if (relevant.length === 0) {
      this.log('No online pools to pause.');
      return;
    }

    try {
      this.elements.synapseResumeBtn.disabled = true;
      this.elements.synapsePauseBtn.disabled = true;
      this.log(`Pausing ${relevant.length} Synapse pool${relevant.length > 1 ? 's' : ''}...`);

      for (const idx of relevant) {
        const entry = this.synapsePools[idx];
        try {
          const url = `${this.baseUrl}${entry.pool.id}/pause?api-version=2021-06-01`;
          await this.makeApiCall(url, { method: 'POST' });
          this.log(`✓ Pause initiated for ${entry.pool.name}`);
        } catch (err) {
          this.logError(`Failed to pause ${entry.pool.name}: ${err.message}`);
        }
      }

      setTimeout(() => this.scanSynapsePools(), 3000);
    } finally {
      this.updateSynapseButtons();
    }
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const app = new AzureResourceEnabler();
  app.init();
});
