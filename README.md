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
- 🗃️ **SQL Database Status** — See which Azure SQL Serverless databases are Paused vs Online without waking them
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

---

## 🚀 Quick Start (5 minutes)

### Step 1: Clone the Repo

```bash
git clone https://github.com/nickTinMicrosoft/Azure-Resource-Enabler-Extension.git
```

### Step 2: Load in Microsoft Edge

1. Open Edge and navigate to `edge://extensions/`
2. Turn ON **Developer mode** (toggle on the left sidebar)
3. Click **"Load unpacked"**
4. Select the cloned `Azure-Resource-Enabler-Extension` folder
5. **Copy your Extension ID** — it's shown on the extension card (e.g., `gjheemjihjelcpfmblppgogifohlimmc`)

### Step 3: Create an Azure AD App Registration

> ⚠️ You need this once per tenant. If someone on your team already did this, skip to Step 4.

1. Go to [Azure Portal → App Registrations → New Registration](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade)
2. Set:
   - **Name**: `Azure Resource Enabler Extension`
   - **Supported account types**: "Accounts in this organizational directory only"
   - **Redirect URI**: Select **Single-page application (SPA)** and enter:
     ```
     https://YOUR-EXTENSION-ID.chromiumapp.org/
     ```
     Replace `YOUR-EXTENSION-ID` with the ID from Step 2.
3. Click **Register**
4. Go to **API Permissions** → **Add a permission**:
   - Add **Azure Service Management** → Delegated → `user_impersonation`
   - Add **Microsoft Graph** → Delegated → `User.Read`
5. (Optional) Click **"Grant admin consent"** if you have admin privileges
6. Go to **Authentication** → Under "Advanced settings", set **Allow public client flows** to **Yes**
7. Copy the **Application (client) ID**

### Step 4: Configure the Extension

1. Click the extension icon in your Edge toolbar (pin it first if needed)
2. Click the **⚙** gear icon
3. Paste your **Application (client) ID** from Step 3
4. Click **Save**
5. Click **⟳** to scan — you'll be prompted to sign in

### Step 5 (Optional): Share with Colleagues

Each person who installs the extension will get a **different Extension ID**. To support multiple users with a single App Registration:

1. In the Azure Portal, go to your App Registration → **Authentication**
2. Under **Single-page application** redirect URIs, add each person's redirect URI:
   ```
   https://THEIR-EXTENSION-ID.chromiumapp.org/
   ```
3. They configure the same Client ID in their extension settings

---

## Alternative: Use the Shared App Registration

If your team already has a shared App Registration set up, just:
1. Clone the repo and load the extension (Steps 1-2 above)
2. Get the **Client ID** from your team
3. Ask an admin to add your redirect URI (`https://YOUR-EXTENSION-ID.chromiumapp.org/`) to the app registration
4. Configure the Client ID in the extension settings (Step 4 above)

## Usage

1. Click the extension icon
2. Click **⟳** to scan
3. Select your subscription from the dropdown
4. View the list of disabled resources, grouped by type
5. Either:
   - Click **Enable** on individual items
   - Check multiple items and click **Re-enable Selected**
   - Click **Re-enable All** to fix everything

### SQL Database Status Tab

Click the **🗃️ SQL Status** tab to see the runtime state of all Azure SQL databases in your subscription:

- **Online** (green) — database is running
- **Paused** (orange) — serverless database is auto-paused (saving cost)
- **Resuming** (blue) — database is waking up

Use the **"Serverless only"** filter to show only serverless-tier databases. This view is completely read-only — it uses ARM management-plane GET calls that do **not** wake paused databases.

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
