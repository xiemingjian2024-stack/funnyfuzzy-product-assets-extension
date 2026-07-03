export function normalizeNasPath(value) {
  return String(value || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/^\/\/\[(\d{1,3}(?:\.\d{1,3}){3}\/?)\]\(https?:\/\/[^\)]+\)/i, "$1")
    .replace(/^\[(\d{1,3}(?:\.\d{1,3}){3}\/?)\]\(https?:\/\/[^\)]+\)/i, "$1")
    .replace(/^nas_material_url\s*[:=：]\s*/i, "")
    .replace(/^\/System\/Volumes\/Data\/Volumes\//i, "192.168.2.4/")
    .replace(/^\/Volumes\//i, "192.168.2.4/")
    .replace(/^smb:\/\//i, "")
    .replace(/^\\\\/, "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

export function formatNasPathForPlatform(value, platform = navigator.platform) {
  const neutralPath = normalizeNasPath(value);
  if (!neutralPath) return "";

  if (/win/i.test(platform)) {
    return `\\\\${neutralPath.replace(/\//g, "\\")}`;
  }

  return `smb://${neutralPath}`;
}

export function formatNasNavigationTarget(value, platform = navigator.platform) {
  const systemPath = formatNasPathForPlatform(value, platform);
  if (!systemPath) return "";

  if (/win/i.test(platform)) {
    return systemPath;
  }

  return encodeURI(systemPath);
}
