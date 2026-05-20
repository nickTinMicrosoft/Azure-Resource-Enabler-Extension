# Azure Resource Enabler - Edge Extension

A Microsoft Edge browser extension that discovers Azure resources disabled by nightly policy and lets you re-enable them with one click — without navigating the Azure Portal.

## Problem

Many organizations run nightly Azure Policy remediation that disables security-sensitive settings:
- **Storage Accounts**: Shared key access turned off
- **Event Hubs**: Local authentication disabled
- **Azure SQL Servers**: Public network access disabled
- **Cosmos DB**: Public network access disabled
- **Key Vaults**: Public network access disabled
- **Service Bus**: Local authentication disabled

This extension provides a single interface to detect all affected resources and selectively re-enable them.

## Features

- 🔐 **Secure Auth** — PKCE OAuth2 with silent-first strategy; stays logged in across sessions
- 🔍 **Auto-Discovery** — Scans your subscription for all disabled resources across multiple service types
- 📋 **Grouped View** — Resources organized by type with clear descriptions of what's disabled
- ✅ **Selective Enable** — Toggle individual resources or bulk re-enable all at once
- 🔄 **Extensible** — Easy to add new resource types via handler pattern
- ⚙️ **Configurable** — Custom App Registration Client ID, debug mode, auto-scan on open

## Supported Resource Types

| Resource | What's Checked | Re-enable Action |
|---|---|---|
| Storage Accounts | `allowSharedKeyAccess` | Set to `true` |
| Event Hubs | `disableLocalAuth` | Set to `false` |
| Azure SQL Servers | `publicNetworkAccess` | Set to `Enabled` |
| Cosmos DB | `publicNetworkAccess` | Set to `Enabled` |
| Key Vaults | `publicNetworkAccess` | Set to `Enabled` |
| Service Bus | `disableLocalAuth` | Set to `false` |

## Installation

### 1. Load in Microsoft Edge

1. Open Edge and go to `edge://extensions/`
2. Enable **Developer mode** (toggle in the left sidebar)
3. Click **Load unpacked**
4. Select this folder
5. Pin the extension to your toolbar

### 2. Azure AD App Registration

You need an App Registration with these API permissions:
- **Azure Service Management** → `user_impersonation` (Delegated)
- **Microsoft Graph** → `User.Read` (Delegated)

Set the redirect URI to: `https://<extension-id>.chromiumapp.org/`
(Find your extension ID on the `edge://extensions/` page)

### 3. Configure the Extension

1. Click the extension icon
2. Click the ⚙ gear button
3. Enter your App Registration Client ID
4. Click Save

## Usage

1. Click the extension icon
2. Click **⟳** to scan
3. Select your subscription from the dropdown
4. View the list of disabled resources, grouped by type
5. Either:
   - Click **Enable** on individual items
   - Check multiple items and click **Re-enable Selected**
   - Click **Re-enable All** to fix everything

## Required Azure Permissions

- **Reader** on the subscription (to discover resources)
- **Contributor** on individual resources (to modify settings)

## Architecture

```
popup.html  ←→  popup.js (AzureResourceEnabler class)
                    ↕
              Azure ARM REST API
                    ↕
         background.js (token refresh alarm)
```

- **No build step** — plain HTML/CSS/JS
- **Manifest V3** — modern Chrome extension architecture
- **Extensible handlers** — add new resource types by adding entries to `RESOURCE_HANDLERS`

## Adding New Resource Types

Edit `popup.js` and add an entry to `RESOURCE_HANDLERS`:

```javascript
'Microsoft.YourProvider/resourceType': {
  label: 'Display Name',
  icon: '🎯',
  apiVersion: '2024-01-01',
  checks: [
    {
      id: 'settingName',
      description: 'What is disabled',
      isDisabled: (resource) => resource.properties?.someSetting === false,
      fix: (resource) => ({
        method: 'PATCH',
        url: `https://management.azure.com${resource.id}?api-version=2024-01-01`,
        body: { properties: { someSetting: true } }
      })
    }
  ]
}
```

## Troubleshooting

- **No subscriptions found**: Verify your account has Reader access to at least one subscription
- **Authentication fails**: Check your Client ID and ensure the redirect URI matches your extension ID
- **Cannot re-enable**: You need Contributor (or equivalent write) permissions on the specific resource
- **Enable debug mode**: Check the "Debug" checkbox for detailed API logging

## License

Internal tool — provided as-is for team use.
