# Azure Resource Enabler Extension — Project Documentation

> **Classification:** Internal | **Version:** 1.1 | **Last Updated:** June 9, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Use Cases](#2-use-cases)
3. [Feature Inventory](#3-feature-inventory)
4. [Architecture & Technical Design](#4-architecture--technical-design)
5. [Development Cycles](#5-development-cycles)
6. [Deployment & Distribution](#6-deployment--distribution)
7. [Future Roadmap](#7-future-roadmap)
8. [Appendix](#appendix)

---

## 1. Project Overview

### Executive Summary

The **Azure Resource Enabler Extension** is an internal Microsoft Edge browser extension purpose-built for Azure platform engineers. It solves the daily operational pain caused by nightly Azure Policy remediation tasks that disable security-sensitive settings across multiple resource types. The extension provides single-click discovery and bulk remediation via ARM REST APIs — eliminating the need to manually navigate the Azure Portal each morning.

This tool was conceived, built, and shipped in under three days with zero external dependencies, demonstrating the power of a focused single-class architecture and the extensibility of Chrome's Manifest V3 platform.

### Problem Statement

Organizations running Azure Policy in enforcement mode frequently configure nightly remediation tasks that disable settings such as:

- **Shared key access** on Storage Accounts
- **Public network access** on Storage Accounts, Cosmos DB, Key Vaults, and AI Foundry workspaces
- **Local authentication** on Event Hubs, Service Bus, and SQL Servers
- **Key-based authentication** on Machine Learning workspaces

These policies exist to maintain a secure-by-default posture in production environments. However, in **development and testing subscriptions**, engineers rely on these settings being enabled for daily work. Each morning, engineers must:

1. Identify which resources were affected overnight
2. Navigate to each resource in the Azure Portal
3. Locate the correct settings blade
4. Toggle each setting back to its enabled state
5. Wait for ARM propagation and verify

For teams managing 20–50+ resources across multiple types, this process consumes **30–60 minutes daily** and is highly error-prone. Resources are frequently missed, causing downstream failures in pipelines, local development, and integration tests.

### Solution

A **zero-dependency Edge extension** using Manifest V3 architecture that:

- Authenticates via **PKCE OAuth2** with silent-first strategy (no user interaction after first login)
- Discovers all affected resources across a subscription in **parallel** using ARM REST API calls
- Presents resources in a **grouped, categorized view** with clear status indicators
- Enables **selective or bulk remediation** with a single click
- Supports the **full resource lifecycle**: discover → enable → disable → delete

The entire application is contained in a single-class design (`AzureResourceEnabler`) with an extensible handler pattern (`RESOURCE_HANDLERS`) that makes adding new resource types trivial — typically requiring only a configuration object, no new code.

### Business Value

| Metric | Before | After |
|--------|--------|-------|
| Time to remediate (daily) | 30–60 min | < 2 min |
| Resources missed per week | 3–5 | 0 |
| Portal navigation required | Yes (per resource) | None |
| New resource type support | N/A | ~15 min config change |
| Dependencies to manage | N/A | 0 |
| Training required | Portal knowledge | Click "Refresh" |

---

## 2. Use Cases

### Primary Persona: Azure Platform Engineer / DevOps

**Profile:** Mid-to-senior engineer working daily with Azure resources in development/test subscriptions. Needs resources enabled for local development, integration testing, and pipeline execution each morning after nightly policy remediation runs.

**Pain Points:**
- Wastes 30+ minutes each morning navigating the Portal
- Frequently forgets which resource types are affected
- Cannot easily see which specific checks failed on which resources
- Must repeat the process if policy runs mid-day

### Secondary Persona: Team Lead / Engineering Manager

**Profile:** Manages a team of 5–15 engineers sharing a subscription. Responsible for distributing tooling and maintaining the shared App Registration.

**Pain Points:**
- Team velocity impacted by daily remediation overhead
- Needs visibility into resource state across the subscription
- Wants standardized tooling instead of ad-hoc scripts per engineer

### Administrator Persona: Subscription Owner

**Profile:** Owns the subscription and manages cleanup of orphaned/abandoned resources.

**Pain Points:**
- Orphaned resources accumulate cost
- Deletion in Portal requires navigating to each resource individually
- Accidental deletion of active resources is a major risk

---

### User Stories

#### US-1: Discover Disabled Resources
> **As a** developer,
> **I want to** quickly see which of my resources were disabled overnight,
> **So that** I can re-enable them before starting work.

**Acceptance Criteria:**
- [ ] Extension displays all disabled resources grouped by type within 10 seconds
- [ ] Each resource shows which specific checks failed
- [ ] Resources are discoverable across all 7 supported types
- [ ] Clear visual distinction between resource types via icons

#### US-2: Bulk Re-Enable All
> **As a** developer,
> **I want to** re-enable all disabled resources with one click,
> **So that** I don't waste time in the portal.

**Acceptance Criteria:**
- [ ] "Re-enable All" button triggers remediation for every disabled resource
- [ ] Progress is visible during bulk operation
- [ ] Success/failure status shown per resource after completion
- [ ] Failed resources are clearly indicated for retry

#### US-3: Selective Re-Enable
> **As a** developer,
> **I want to** selectively re-enable specific resources while leaving others disabled,
> **So that** I can maintain intentional disabled states for testing.

**Acceptance Criteria:**
- [ ] Checkboxes available on each resource
- [ ] "Re-enable Selected" button operates only on checked items
- [ ] Unselected resources remain unchanged
- [ ] Selection state persists during the operation

#### US-4: View Enabled Resources
> **As a** team lead,
> **I want to** view currently-enabled resources and their status across my subscription,
> **So that** I have full visibility into resource configuration state.

**Acceptance Criteria:**
- [ ] Separate "Enabled" tab shows all passing resources
- [ ] Each enabled resource shows which checks are passing (as badges)
- [ ] Resource count displayed per category

#### US-5: Intentional Disable
> **As a** team lead,
> **I want to** intentionally disable specific checks for compliance testing,
> **So that** I can verify policy enforcement behavior.

**Acceptance Criteria:**
- [ ] Dropdown menu on enabled resources with disable actions
- [ ] Each check can be independently disabled
- [ ] Confirmation before disabling
- [ ] Resource moves to "Disabled" tab after action

#### US-6: Safe Resource Deletion
> **As an** admin,
> **I want to** delete orphaned resources with safety confirmation,
> **So that** I prevent accidental deletion of active resources.

**Acceptance Criteria:**
- [ ] Delete action requires first confirmation click
- [ ] Second confirmation requires typing the exact resource name
- [ ] Typos in confirmation are rejected
- [ ] Successful deletion removes resource from the list
- [ ] Delete is available on both enabled and disabled resources

#### US-7: Category Selection
> **As a** developer,
> **I want to** select all resources in a category with one checkbox click,
> **So that** I can quickly enable all Storage Accounts (for example) without selecting each one.

**Acceptance Criteria:**
- [ ] Category header has a "Select All" checkbox
- [ ] Checking category checkbox selects all resources in that category
- [ ] Unchecking category checkbox deselects all resources in that category
- [ ] Partial selection shows indeterminate (tri-state) checkbox
- [ ] Master "Select All" above the list controls everything

#### US-8: SQL Database Status Monitor
> **As an** Azure engineer using SQL Serverless databases with auto-pause enabled,
> **I want to** view the runtime state (Online, Paused, Resuming) of my serverless databases without waking them up,
> **So that** I can safely verify which databases are paused before deciding to connect.

**Acceptance Criteria:**
- [ ] New "🗃️ SQL Status" tab displayed alongside existing Disabled/Enabled tabs
- [ ] Databases grouped by parent SQL Server
- [ ] Color-coded status badges displayed per database (green = Online, gray = Paused, yellow = Resuming)
- [ ] Optional filter to show only serverless-tier databases
- [ ] Tab is purely informational — no enable/disable/delete actions available
- [ ] ARM GET call does NOT trigger auto-resume on paused serverless databases
- [ ] Status data refreshes when user clicks "Refresh" or on auto-scan
- [ ] Uses ARM REST API: `GET .../Microsoft.Sql/servers/{server}/databases?api-version=2023-08-01-preview`

---

## 3. Feature Inventory

### Complete Feature Matrix

| # | Feature | Description | Sprint | Status |
|---|---------|-------------|--------|--------|
| 1 | PKCE OAuth2 Authentication | Silent-first strategy with refresh token fallback and interactive login. Tenant-specific endpoints. | 1 | ✅ Complete |
| 2 | Token Caching & Background Refresh | Tokens stored in `chrome.storage.local`; background service worker refreshes every 55 minutes via Chrome alarms. | 1 | ✅ Complete |
| 3 | Auto-Login on Open | Extension attempts silent auth when popup opens (configurable via settings). | 1 | ✅ Complete |
| 4 | Subscription Enumeration | Lists all accessible Azure subscriptions via ARM API with display name and ID. | 1 | ✅ Complete |
| 5 | Multi-Type Resource Discovery | Scans subscription for 7 resource types using parallel ARM API calls. | 1 | ✅ Complete |
| 6 | Grouped Resource View | Resources organized by type with icons: 🗄️ Storage, ⚡ Event Hubs, 🛢️ SQL, 🌐 Cosmos, 🔑 Key Vault, 🚌 Service Bus, 🤖 AI Foundry. | 1 | ✅ Complete |
| 7 | Individual Enable Action | Per-resource "Enable" button with working/spinner state indicator. | 1 | ✅ Complete |
| 8 | Multi-Select with Checkboxes | Individual resource checkboxes for selective operations. | 1 | ✅ Complete |
| 9 | "Re-enable Selected" Bulk Action | Operates on all checked resources across all categories. | 1 | ✅ Complete |
| 10 | "Re-enable All" Bulk Action | Enables all disabled resources in one operation regardless of selection state. | 1 | ✅ Complete |
| 11 | Configurable Client ID | Settings panel for custom Azure AD App Registration Client ID. | 1 | ✅ Complete |
| 12 | Debug Mode | Verbose API request/response logging in scrollable log textarea. | 1 | ✅ Complete |
| 13 | Auto-Scan on Open | Optional setting to auto-discover resources on popup open (after auth). | 1 | ✅ Complete |
| 14 | Custom Azure-Themed Icon | Blue circle with power symbol matching Azure design language. | 1 | ✅ Complete |
| 15 | Public Network Access Checks | Additional check for Storage Accounts covering `publicNetworkAccess` property. | 2 | ✅ Complete |
| 16 | AI Foundry / ML Handler | Machine Learning Workspaces with public network access + key-based auth checks. | 2 | ✅ Complete |
| 17 | Enabled Resources Tab | Separate tab showing currently-enabled resources with passed checks displayed as green badges. | 2 | ✅ Complete |
| 18 | Disable Actions | Dropdown menu per enabled resource to disable specific checks individually. | 2 | ✅ Complete |
| 19 | Delete with Double-Confirm | Modal dialog requiring exact resource name input before deletion proceeds. | 2 | ✅ Complete |
| 20 | Progress Bar | Visual scan progress indicator showing discovery completion percentage. | 2 | ✅ Complete |
| 21 | Category "Select All" Checkboxes | Group header checkboxes that select/deselect all items in that resource category. | 3 | ✅ Complete |
| 22 | Master "Select All" | Toolbar checkbox above the resource list that selects/deselects everything. | 3 | ✅ Complete |
| 23 | Tri-State Indeterminate Logic | Category and master checkboxes show indeterminate state when partially selected. | 3 | ✅ Complete |
| 24 | SQL Database Status Monitor | New "🗃️ SQL Status" tab displaying runtime state (Online/Paused/Resuming) of Azure SQL Serverless databases via read-only ARM GET calls that do not trigger auto-resume. Databases grouped by SQL Server with color-coded status badges. | 4 | 🔨 In Development |

### Resource Types Supported

| Resource Type | ARM Provider | Checks | API Version |
|---------------|-------------|--------|-------------|
| Storage Accounts | `Microsoft.Storage/storageAccounts` | Shared Key Access, Public Network Access | 2023-05-01 |
| Event Hubs | `Microsoft.EventHub/namespaces` | Local Authentication Disabled | 2024-01-01 |
| SQL Servers | `Microsoft.Sql/servers` | Local Authentication Disabled | 2023-08-01 |
| Cosmos DB | `Microsoft.DocumentDB/databaseAccounts` | Public Network Access | 2024-05-15 |
| Key Vaults | `Microsoft.KeyVault/vaults` | Public Network Access | 2023-07-01 |
| Service Bus | `Microsoft.ServiceBus/namespaces` | Local Authentication Disabled | 2024-01-01 |
| AI Foundry (ML) | `Microsoft.MachineLearningServices/workspaces` | Public Network Access, Key-Based Auth | 2024-04-01 |

---

## 4. Architecture & Technical Design

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│  popup.html (UI Layer)                                      │
│  ├── styles.css (Fluent Design CSS Variables)               │
│  └── popup.js (AzureResourceEnabler class)                  │
│       ├── RESOURCE_HANDLERS (config object)                 │
│       ├── Auth Module (PKCE, tokens, refresh)               │
│       ├── Discovery Module (ARM API calls)                  │
│       ├── Remediation Module (PATCH/POST)                   │
│       └── UI Module (render, events, state)                 │
├─────────────────────────────────────────────────────────────┤
│  background.js (Service Worker)                             │
│  └── Chrome Alarm → Token Refresh (55min interval)          │
├─────────────────────────────────────────────────────────────┤
│  manifest.json (Manifest V3)                                │
│  ├── host_permissions: management.azure.com,                │
│  │   login.microsoftonline.com, graph.microsoft.com         │
│  └── permissions: identity, storage, alarms                 │
└─────────────────────────────────────────────────────────────┘
         ↕ HTTPS (Bearer Token in Authorization header)
┌─────────────────────────────────────────────────────────────┐
│  Azure ARM REST API                                         │
│  ├── GET  /subscriptions (enumeration)                      │
│  ├── GET  /subscriptions/{id}/providers/{type} (discovery)  │
│  ├── PATCH /subscriptions/{id}/resourceGroups/{rg}/         │
│  │         providers/{type}/{name} (remediation)            │
│  └── DELETE /subscriptions/{id}/resourceGroups/{rg}/        │
│            providers/{type}/{name} (deletion)               │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Single-Class Architecture:** All logic lives in `AzureResourceEnabler`. No module system, no imports, no build step. This keeps the extension instantly loadable and debuggable.

2. **Configuration over Code:** New resource types are added by extending the `RESOURCE_HANDLERS` object — no new functions or UI code required. The rendering engine dynamically adapts to any handler structure.

3. **Zero Dependencies:** No npm packages, no frameworks, no transpilation. Pure ES2020+ JavaScript running natively in the browser. This eliminates supply chain risk and removes all build/deploy complexity.

4. **Silent-First Auth:** The extension never prompts for login unless absolutely necessary. Token caching + background refresh means engineers authenticate once and stay authenticated indefinitely.

5. **Fail-Safe Destructive Actions:** Delete operations require two distinct confirmations including exact name matching — making accidental deletion virtually impossible.

### Authentication Flow

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Extension   │     │ chrome.storage   │     │  Azure AD v2.0  │
│  (popup.js)  │     │    .local        │     │  Token Endpoint │
└──────┬───────┘     └────────┬─────────┘     └────────┬────────┘
       │                      │                         │
       │  1. Check cache      │                         │
       │─────────────────────►│                         │
       │                      │                         │
       │  2. Return token     │                         │
       │◄─────────────────────│                         │
       │                      │                         │
       │  3a. If valid → USE  │                         │
       │                      │                         │
       │  3b. If expired, try silent refresh            │
       │────────────────────────────────────────────────►
       │                      │                         │
       │  4. New token        │                         │
       │◄───────────────────────────────────────────────│
       │                      │                         │
       │  5. Cache new token  │                         │
       │─────────────────────►│                         │
       │                      │                         │
       │  3c. If no refresh token → Interactive PKCE    │
       │  ┌───────────────────────────────────────┐     │
       │  │ chrome.identity.launchWebAuthFlow()   │     │
       │  │ → /authorize with code_challenge      │     │
       │  │ → User consents                       │     │
       │  │ → Redirect with auth code             │     │
       │  │ → Exchange code + verifier for token  │     │
       │  └───────────────────────────────────────┘     │
       │                      │                         │
```

**Key Implementation Details:**

- **PKCE (Proof Key for Code Exchange):** Generates a cryptographic `code_verifier` and derives `code_challenge` via SHA-256. This eliminates the need for a client secret, making the extension safe for distribution.
- **Tenant-Specific Endpoints:** Uses `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/` rather than `/common` — this resolved early authentication failures where multi-tenant apps were rejected.
- **Token Lifetime:** Access tokens expire in ~60–75 minutes. Background alarm at 55 minutes ensures proactive refresh before expiration.
- **Scopes Requested:** `https://management.azure.com/user_impersonation` + `offline_access`

### Handler Pattern (Extensibility)

The `RESOURCE_HANDLERS` object is the core extensibility mechanism. Each key represents an ARM resource type, and its value defines how to discover, evaluate, remediate, and disable that type:

```javascript
RESOURCE_HANDLERS = {
  'Microsoft.Storage/storageAccounts': {
    label: 'Storage Accounts',
    icon: '🗄️',
    apiVersion: '2023-05-01',
    deleteApiVersion: '2023-05-01',
    checks: [
      {
        id: 'allowSharedKeyAccess',
        description: 'Shared Key Access is disabled',
        disableDescription: 'Disable Shared Key Access',
        isDisabled: (resource) => resource.properties.allowSharedKeyAccess === false,
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
        description: 'Public Network Access is disabled',
        disableDescription: 'Disable Public Network Access',
        isDisabled: (resource) => resource.properties.publicNetworkAccess === 'Disabled',
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
  }
  // ... additional handlers follow same pattern
}
```

**Adding a New Resource Type** (example: Container Registry):
1. Identify the ARM provider path (e.g., `Microsoft.ContainerRegistry/registries`)
2. Determine which properties indicate "disabled" state
3. Identify the correct API version from ARM documentation
4. Add a new entry to `RESOURCE_HANDLERS` — no other code changes needed

### Data Flow

```
User Action          Extension Logic                      Azure ARM API
───────────          ───────────────                      ─────────────

Click Refresh  ──►  scanResources()
                     │
                     ├──► GET /subscriptions ────────────► Returns list
                     │    Select active subscription
                     │
                     ├──► For EACH handler key (parallel):
                     │    GET /subscriptions/{id}/
                     │        providers/{type}  ──────────► Returns resources[]
                     │
                     ├──► For EACH resource:
                     │    Evaluate checks[].isDisabled()
                     │    Categorize → disabled[] or enabled[]
                     │
                     └──► renderDisabledResources()
                          renderEnabledResources()
                          Update UI state + counts

Click Enable   ──►  enableResource(resource, check)
                     │
                     ├──► check.fix(resource) → { method, url, body }
                     │
                     ├──► fetch(url, { method, headers, body }) ──► ARM PATCH
                     │
                     └──► Update UI (success/error indicator)
                          Re-scan to refresh state
```

### Permissions Model

| Azure Role | Scope | Purpose |
|-----------|-------|---------|
| **Reader** | Subscription | Required for subscription enumeration and resource discovery (GET operations) |
| **Contributor** | Resource Group or Resource | Required for PATCH/POST remediation and DELETE operations |

**Minimum Viable Permissions:**
- If the user only has Reader access, they can discover disabled resources but "Enable" buttons will fail with 403.
- The extension gracefully handles 403 responses and displays an appropriate error message.

### Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Token storage | `chrome.storage.local` — encrypted at rest by browser, inaccessible to web pages |
| Client secret exposure | PKCE flow eliminates need for client secret entirely |
| Cross-origin requests | Manifest V3 `host_permissions` restricts allowed domains |
| Token lifetime | 55-minute proactive refresh; tokens never persist beyond session |
| Accidental deletion | Double-confirmation with exact name match required |
| Scope creep | Only `user_impersonation` scope — no admin consent required |

---

## 5. Development Cycles

### Sprint 1: Foundation

**Date:** May 20, 2026
**Duration:** 1 day (approximately 4 hours active development)
**Commits:** 6 (a93d642 → 436f51a)
**Sprint Goal:** Deliver a fully functional extension capable of authenticating, discovering, and re-enabling disabled Azure resources.

#### Sprint Backlog

| Commit | Time | Story | Deliverable |
|--------|------|-------|-------------|
| a93d642 | 14:50 | Core scaffold | Initial extension structure — `AzureResourceEnabler` class, `manifest.json`, `popup.html`, basic CSS, `RESOURCE_HANDLERS` for 5 types |
| daa0497 | 14:57 | Auth config | App Registration configuration with hardcoded Client ID for initial testing |
| 48d9634 | 15:31 | Auth bugfix | Switched from `/common` to tenant-specific OAuth endpoint — resolved "AADSTS50020" errors |
| b33678d | 15:35 | Documentation | README with complete installation, team-sharing, and App Registration instructions |
| e9158a7 | 15:37 | Branding | Custom Azure-themed icon (blue circle with power symbol SVG) |
| 436f51a | 15:44 | Auto-login UX | Silent authentication attempt on popup open; auto-load subscription dropdown |

#### Sprint 1 Outcome

Fully functional extension shipped to the team on the same day. Capabilities:
- ✅ PKCE OAuth2 with token caching and background refresh
- ✅ Subscription enumeration and selection
- ✅ Parallel resource discovery across 5+ resource types
- ✅ Grouped UI with type icons
- ✅ Individual enable, multi-select, bulk enable
- ✅ Configurable Client ID and debug mode
- ✅ Auto-login and auto-scan settings

#### Sprint 1 Retrospective

| What went well | What to improve |
|---------------|-----------------|
| Single-class design enabled rapid iteration | Auth took longest due to tenant-specific endpoint discovery |
| Handler pattern proven extensible immediately | Need bidirectional management (enable AND disable) |
| Zero-dep approach meant instant team distribution | No way to see currently-enabled resources |

---

### Sprint 2: Feature Expansion

**Date:** May 22, 2026
**Duration:** 1 day (approximately 3 hours active development)
**Commits:** 2 (2f93e02, d0fcab1)
**Sprint Goal:** Expand resource coverage, add full lifecycle management (enable + disable + delete), and provide visibility into enabled resources.

#### Sprint Backlog

| Commit | Time | Story | Deliverable |
|--------|------|-------|-------------|
| 2f93e02 | 12:37 | Resource expansion | Added `publicNetworkAccess` check for Storage Accounts; new AI Foundry/ML Workspace handler with 2 checks |
| d0fcab1 | 13:35 | Full lifecycle | Enabled Resources tab, per-resource disable dropdown actions, delete modal with exact-name double-confirmation, progress bar |

#### Sprint 2 Outcome

Extension now provides complete resource lifecycle management:
- ✅ 7 resource types covered (added AI Foundry/ML)
- ✅ 10 total security checks across all types
- ✅ Two-tab UI: "Disabled" (needs attention) and "Enabled" (healthy)
- ✅ Disable actions via dropdown on enabled resources
- ✅ Safe deletion with double-confirm modal
- ✅ Visual progress bar during scanning

#### Sprint 2 Retrospective

| What went well | What to improve |
|---------------|-----------------|
| Handler pattern made AI Foundry addition trivial | Bulk selection UX poor with many resources |
| Double-confirm delete provides confidence | Need category-level selection |
| Two-tab design provides complete visibility | Master "select all" missing |

---

### Sprint 3: UX Improvements

**Date:** June 3, 2026
**Duration:** 1 day
**Status:** Complete (pending commit)
**Sprint Goal:** Improve bulk selection UX for users managing large numbers of disabled resources.

#### Sprint Backlog

| Change | Story | Description |
|--------|-------|-------------|
| Category "Select All" | US-7 | Checkbox on each resource-type group header that selects/deselects all items in that category |
| Master "Select All" | US-7 | Toolbar checkbox above the entire resource list that selects/deselects everything |
| Tri-State Indeterminate Logic | US-7 | Category and master checkboxes display browser-native indeterminate state when partially selected |

#### Sprint 3 Outcome

Users managing dozens of disabled resources can now:
- ✅ Select an entire category (e.g., all 8 Storage Accounts) with one click
- ✅ Select everything across all categories with master checkbox
- ✅ See partial selection state via indeterminate checkbox rendering
- ✅ Combine category and individual selections intuitively

#### Technical Implementation Notes

The tri-state logic follows a bottom-up propagation model:
1. Individual checkbox change → recalculate category state
2. Category state: all checked → checked; none checked → unchecked; mixed → indeterminate
3. Category checkbox change → propagate to all children, then recalculate master
4. Master state follows same logic across all categories
5. `HTMLInputElement.indeterminate = true` used for native browser rendering

---

## 6. Deployment & Distribution

### Prerequisites

| Requirement | Details |
|-------------|---------|
| Browser | Microsoft Edge (Chromium-based) or Google Chrome 116+ |
| Azure AD Account | Must have access to target Azure subscription(s) |
| Azure Role | Reader (minimum for discovery); Contributor (for remediation) |
| App Registration | One per Azure AD tenant; can be shared across entire team |

### Installation Steps

#### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Azure-Resource-Enabler-Extension
```

#### Step 2: Load Extension in Edge

1. Open `edge://extensions/` in Microsoft Edge
2. Enable **Developer Mode** (toggle in bottom-left or top-right)
3. Click **"Load unpacked"**
4. Select the repository folder containing `manifest.json`
5. Note the **Extension ID** displayed on the extension card (32-character string)

#### Step 3: Create App Registration (One-Time per Tenant)

1. Navigate to [Azure Portal → Azure Active Directory → App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **"New registration"**
3. Configure:
   - **Name:** `Azure Resource Enabler Extension`
   - **Supported account types:** Single tenant (this organization only)
   - **Redirect URI:** Platform = **Single-page application (SPA)**
   - **URI:** `https://{YOUR-EXTENSION-ID}.chromiumapp.org/`
4. Click **Register**

#### Step 4: Configure API Permissions

In the App Registration → **API permissions**:

| API | Permission | Type |
|-----|-----------|------|
| Azure Service Management | `user_impersonation` | Delegated |
| Microsoft Graph | `User.Read` | Delegated |

Click **"Grant admin consent"** if you have admin privileges (otherwise request from tenant admin).

#### Step 5: Configure the Extension

1. Click the extension icon in Edge toolbar
2. Open **Settings** (gear icon)
3. Paste the **Application (client) ID** from Step 3
4. Set your **Tenant ID** (found in App Registration → Overview)
5. Save settings

#### Step 6: Authenticate and Scan

1. Click the extension icon
2. Click **"Refresh"** (or enable auto-scan in settings)
3. Complete the one-time interactive login (consent prompt)
4. Resources will populate automatically

### Team Distribution Guide

Since each Edge installation generates a unique Extension ID, team distribution requires adding each team member's redirect URI to the shared App Registration:

1. Each team member: Load extension → note their Extension ID
2. App Registration owner: Add redirect URI `https://{MEMBER-EXTENSION-ID}.chromiumapp.org/` for each member
3. Share the **Client ID** with team (this is NOT a secret — safe to share via Teams/email)
4. Each member configures their extension with the shared Client ID

**Important:** Azure AD allows up to 256 redirect URIs per App Registration — sufficient for most teams.

### Deployment Model

```
┌─────────────────────────────────────────────────────────┐
│  Distribution: Git Clone (no build step)                │
├─────────────────────────────────────────────────────────┤
│  Installation: edge://extensions → Load Unpacked        │
├─────────────────────────────────────────────────────────┤
│  Configuration: Settings panel → Client ID + Tenant ID  │
├─────────────────────────────────────────────────────────┤
│  Updates: git pull → Extension auto-reloads             │
└─────────────────────────────────────────────────────────┘
```

**No CI/CD pipeline required.** The extension is plain files with no transpilation, bundling, or minification. Updates are distributed via `git pull` and the extension reloads automatically in Developer Mode.

---

## 7. Future Roadmap

### 🔨 In Development

| Enhancement | Description | Estimated Effort | Business Value | Status |
|-------------|-------------|-----------------|----------------|--------|
| SQL Database Status Monitor | A new "🗃️ SQL Status" tab that displays the runtime state (Online, Paused, Resuming) of Azure SQL Serverless databases without waking them. Uses ARM management-plane GET calls (`Microsoft.Sql/servers/{server}/databases?api-version=2023-08-01-preview`) that are safe and never trigger auto-resume. Databases grouped by SQL Server with color-coded badges (green=Online, gray=Paused, yellow=Resuming). Optional filter for serverless-tier only. Purely informational — no modification actions. | 1–2 days | Eliminates accidental wake-ups from Portal/SSMS; saves serverless compute costs; provides instant visibility into database pause state; complements existing policy-remediation workflow | 🔨 Sprint 4 |

### High Priority

| Enhancement | Description | Estimated Effort | Business Value |
|-------------|-------------|-----------------|----------------|
| Additional Resource Types | App Service, Container Registry, Azure Functions, Cognitive Services, API Management | 1–2 hours per type | Broader coverage for teams using these services |
| Cross-Subscription Scanning | Scan all accessible subscriptions simultaneously with combined results view | 1 day | Teams working across multiple subscriptions (dev, staging, shared) |
| Favorites / Pinned Resources | Pin frequently-remediated resources to top of list | 0.5 day | Faster access to most-used resources |

### Medium Priority

| Enhancement | Description | Estimated Effort | Business Value |
|-------------|-------------|-----------------|----------------|
| Scheduled Auto-Remediation | Timer-based scan + auto-enable (configurable interval, e.g., every 30 minutes) | 1 day | Truly zero-touch operation — resources stay enabled all day |
| Remediation Audit Log | Exportable log of which resources were remediated, by whom, when | 0.5 day | Compliance documentation and team visibility |
| Notification System | Browser notification when nightly policy runs detected or new resources disabled | 1 day | Proactive awareness without opening extension |
| Resource Group Filtering | Filter discovery by resource group name or pattern | 0.5 day | Focus on relevant resources in large subscriptions |
| Subscription Favorites | Remember preferred subscription instead of re-selecting each time | 0.5 day | Minor UX improvement for daily use |

### Low Priority

| Enhancement | Description | Estimated Effort | Business Value |
|-------------|-------------|-----------------|----------------|
| Enterprise Distribution | Package for Edge Add-ons store with tenant-restricted distribution | 2–3 days | IT-managed deployment, auto-updates |
| Role-Based UI | Hide destructive actions (delete, disable) for users with only Reader role | 1 day | Prevent confusing 403 errors |
| Policy Exception Tracking | Integration with Azure Policy compliance data to show which policy caused the disable | 2 days | Better understanding of why resources were affected |
| Resource Tagging Filter | Filter discovery by resource tags (e.g., `team:platform`, `env:dev`) | 0.5 day | Multi-team subscription management |
| Dark Mode | Respect system/browser dark mode preference | 0.5 day | Developer preference / accessibility |
| Keyboard Shortcuts | Ctrl+A for select all, Enter to enable selected, etc. | 0.5 day | Power user efficiency |
| Export/Import Settings | Backup and restore extension configuration | 0.5 day | Easier onboarding of new team members |

### Architectural Considerations for Future Work

| Decision Point | Options | Recommendation |
|---------------|---------|----------------|
| Multi-subscription | Sequential scan vs. parallel | Parallel with per-subscription progress indicators |
| Auto-remediation | Extension popup vs. background worker | Background service worker with Chrome alarms |
| Enterprise distribution | Edge Add-ons vs. Intune MSIX | Edge Add-ons for auto-updates; Intune for policy control |
| Audit logging | Local storage vs. Azure Table Storage | Start local; migrate to cloud if compliance requires it |

---

## Appendix

### A. Technology Stack

| Layer | Technology | Version / Standard |
|-------|-----------|-------------------|
| Language | JavaScript | ES2020+ (native, no transpilation) |
| Markup | HTML5 | Semantic elements |
| Styling | CSS3 | Custom Properties (CSS Variables), Flexbox, Grid |
| Extension Platform | Chrome Extensions | Manifest V3 |
| Authentication | OAuth2 | PKCE (RFC 7636) via Azure AD v2.0 |
| API | Azure ARM REST | Multiple API versions per resource type |
| Storage | chrome.storage.local | Encrypted browser-managed storage |
| Background | Service Worker | Chrome Alarms API for scheduled refresh |

### B. File Inventory

| File | Purpose | Approximate Lines |
|------|---------|-------------------|
| `manifest.json` | Extension configuration, permissions, service worker registration | ~30 |
| `popup.html` | UI structure — toolbar, tabs, resource lists, modals, settings panel | ~85 |
| `styles.css` | Complete styling with Fluent Design CSS variables, responsive layout | ~700 |
| `popup.js` | All application logic — auth, discovery, remediation, UI rendering, `RESOURCE_HANDLERS` | ~1,200 |
| `background.js` | Service worker — token refresh alarm handler | ~50 |
| `icon.png` | Extension toolbar icon (blue circle + power symbol) | — |
| `README.md` | Installation and usage instructions | ~120 |

### C. Key Metrics

| Metric | Value |
|--------|-------|
| Resource types supported | 7 |
| Security checks covered | 10 |
| Total development time | ~3 days (across 3 sprints) |
| Active development hours | ~10 hours |
| External dependencies | 0 |
| Build step required | None |
| npm packages | 0 |
| Frameworks used | 0 |
| Total commits | 8 |
| Lines of code (approx) | ~2,100 |

### D. API Versions by Resource Type

| Resource Type | Discovery API Version | Remediation API Version | Delete API Version |
|---------------|----------------------|------------------------|-------------------|
| Storage Accounts | 2023-05-01 | 2023-05-01 | 2023-05-01 |
| Event Hub Namespaces | 2024-01-01 | 2024-01-01 | 2024-01-01 |
| SQL Servers | 2023-08-01 | 2023-08-01 | 2023-08-01 |
| Cosmos DB Accounts | 2024-05-15 | 2024-05-15 | 2024-05-15 |
| Key Vaults | 2023-07-01 | 2023-07-01 | 2023-07-01 |
| Service Bus Namespaces | 2024-01-01 | 2024-01-01 | 2024-01-01 |
| ML Workspaces | 2024-04-01 | 2024-04-01 | 2024-04-01 |

### E. Known Limitations

| Limitation | Impact | Workaround |
|-----------|--------|-----------|
| Single subscription at a time | Must switch dropdown to scan another subscription | Planned: cross-subscription scanning |
| Extension ID changes on reinstall | Redirect URI must be updated in App Registration | Document in team onboarding |
| Popup closes on focus loss | Long-running bulk operations interrupted if user clicks away | Operations complete in background; re-open to see results |
| No offline capability | Requires network access to Azure ARM APIs | N/A — tool is inherently online |
| 256 redirect URI limit | Maximum team size per App Registration | Create additional App Registrations if needed |

### F. Troubleshooting Guide

| Symptom | Likely Cause | Resolution |
|---------|-------------|-----------|
| "AADSTS50020" error | Using `/common` endpoint with single-tenant app | Verify Tenant ID is configured correctly in settings |
| "AADSTS700054" error | Refresh token expired (>90 days inactive) | Click Login to re-authenticate interactively |
| 403 on Enable action | Insufficient Azure role | Request Contributor role on target resource/resource group |
| No resources found | Wrong subscription selected; or no disabled resources | Verify subscription in dropdown; check Azure Portal |
| Extension icon grayed out | Extension disabled or crashed | Reload at `edge://extensions/`; check for errors |
| "Invalid redirect URI" | Extension ID mismatch | Copy correct Extension ID → update App Registration redirect URI |

### G. Glossary

| Term | Definition |
|------|-----------|
| **ARM** | Azure Resource Manager — the deployment and management service for Azure |
| **PKCE** | Proof Key for Code Exchange — OAuth2 extension for public clients |
| **Manifest V3** | Latest Chrome extension platform with service workers replacing background pages |
| **Remediation** | The act of re-enabling a disabled setting on an Azure resource |
| **Handler** | Configuration object in `RESOURCE_HANDLERS` defining how to manage a resource type |
| **Check** | A single evaluable condition within a handler (e.g., "is shared key access disabled?") |
| **Nightly Policy** | Azure Policy remediation task scheduled to run overnight |
| **Silent Auth** | Token refresh without user interaction using cached refresh token |
| **Tri-State** | Checkbox with three visual states: checked, unchecked, indeterminate |

---

*Document generated: June 9, 2026*
*Project Owner: Azure Platform Engineering Team*
*Document Author: Project Management Office*
*Review Status: Final — Ready for Stakeholder Review*
