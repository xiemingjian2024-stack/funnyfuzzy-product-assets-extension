const DEFAULT_SETTINGS = {
  serviceUrl: "http://172.16.21.107:8787",
  extensionAccessToken: "ff-assets-local-token-20260605",
  bindingSheetUrl: "https://funnyfuzzy.feishu.cn/base/KhLGbYdBwa49ufswb1WcuyQznKe?table=tbltRiGGsqxuPKVE&view=vewrGW315v",
  allowedDomains: ["funnyfuzzy.com", "funnyfuzzy.co.uk"]
};

export async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const settings = migrateSettings({
    ...DEFAULT_SETTINGS,
    ...stored,
    allowedDomains: normalizeDomains(stored.allowedDomains || DEFAULT_SETTINGS.allowedDomains)
  });

  if (settings.serviceUrl !== stored.serviceUrl || settings.bindingSheetUrl !== stored.bindingSheetUrl) {
    await chrome.storage.sync.set({
      serviceUrl: settings.serviceUrl,
      bindingSheetUrl: settings.bindingSheetUrl
    });
  }

  return settings;
}

export async function saveSettings(settings) {
  await chrome.storage.sync.set({
    serviceUrl: settings.serviceUrl.trim().replace(/\/$/, ""),
    extensionAccessToken: settings.extensionAccessToken.trim(),
    bindingSheetUrl: settings.bindingSheetUrl.trim(),
    allowedDomains: normalizeDomains(settings.allowedDomains)
  });
}

function migrateSettings(settings) {
  const migrated = { ...settings };

  if (migrated.serviceUrl === "http://192.168.2.4:8787") {
    migrated.serviceUrl = DEFAULT_SETTINGS.serviceUrl;
  }

  if (
    migrated.bindingSheetUrl.includes("NdpswztvuiUtNXkBMQTcw87lnPf") ||
    migrated.bindingSheetUrl.includes("Zp8FbWjxfai4zSsmqNJc8aTbnRf") ||
    migrated.bindingSheetUrl.includes("MHdPb5gYvahkAEsfZY6cOGJunpc")
  ) {
    migrated.bindingSheetUrl = DEFAULT_SETTINGS.bindingSheetUrl;
  }

  return {
    ...migrated,
    serviceUrl: migrated.serviceUrl.trim().replace(/\/$/, ""),
    bindingSheetUrl: migrated.bindingSheetUrl.trim()
  };
}

function normalizeDomains(value) {
  if (Array.isArray(value)) return value.map((domain) => domain.trim()).filter(Boolean);
  return String(value)
    .split(/\n|,/)
    .map((domain) => domain.trim())
    .filter(Boolean);
}
