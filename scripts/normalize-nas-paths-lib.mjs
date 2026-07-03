export function buildRecordsUrl({ baseAppToken, tableId, viewId, pageToken, pageSize = 500 }) {
  const url = new URL(`https://open.feishu.cn/open-apis/bitable/v1/apps/${baseAppToken}/tables/${tableId}/records`);
  url.searchParams.set("page_size", String(pageSize));
  if (pageToken) url.searchParams.set("page_token", pageToken);
  if (viewId) url.searchParams.set("view_id", viewId);
  return url;
}

export function normalizeSingleNas(value) {
  const raw = String(value).trim();
  if (!raw) return "";

  let cleaned = raw.replace(/^['"]+|['"]+$/g, "");

  if (/^\/\/\[\d{1,3}(?:\.\d{1,3}){3}\/?\]\(https?:\/\/[^\)]+\)/i.test(cleaned)) {
    cleaned = cleaned.replace(/^\/\/\[(\d{1,3}(?:\.\d{1,3}){3})\/?\]\(https?:\/\/[^\)]+\)/i, "$1");
  } else if (/^\[\d{1,3}(?:\.\d{1,3}){3}\/?\]\(https?:\/\/[^\)]+\)/i.test(cleaned)) {
    cleaned = cleaned.replace(/^\[(\d{1,3}(?:\.\d{1,3}){3})\/?\]\(https?:\/\/[^\)]+\)/i, "$1");
  }

  cleaned = cleaned.replace(/^nas_material_url\s*[:=：]\s*/i, "");

  if (/^\/System\/Volumes\/Data\/Volumes\//i.test(cleaned)) {
    cleaned = cleaned.replace(/^\/System\/Volumes\/Data\/Volumes\//i, "/Volumes/");
  } else if (/^smb:\/\//i.test(cleaned)) {
    cleaned = cleaned.replace(/^smb:\/\//i, "");
  } else if (/^\\\\/.test(cleaned)) {
    cleaned = cleaned.replace(/^\\\\/, "").replace(/\\/g, "/");
  } else if (/^\/{2}\d{1,3}(?:\.\d{1,3}){3}\//.test(cleaned)) {
    cleaned = cleaned.replace(/^\/{2}/, "");
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}\//.test(cleaned)) {
    cleaned = cleaned.replace(/^\d{1,3}(?:\.\d{1,3}){3}\//, "/Volumes/");
  }

  cleaned = cleaned.replace(/\\/g, "/").replace(/\/+/g, "/");

  return `'${cleaned}'`;
}

export function buildFieldValue(text) {
  return text;
}
