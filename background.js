// Background service worker for Azure Resource Enabler Extension
// Handles proactive token refresh via alarms.

const REFRESH_ALARM = 'azure_enabler_refresh';
const REFRESH_INTERVAL_MIN = 55; // ~55 min to stay ahead of 60m token expiry

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_INTERVAL_MIN });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== REFRESH_ALARM) return;
  // Ping the popup (if open) to refresh its token proactively
  chrome.runtime.sendMessage({ type: 'BACKGROUND_REFRESH_PING' }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'PING') {
    sendResponse({ ok: true });
  }
});
