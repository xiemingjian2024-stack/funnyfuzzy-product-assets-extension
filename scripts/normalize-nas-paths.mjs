import "dotenv/config";
import {
  buildFieldValue,
  buildRecordsUrl,
  normalizeSingleNas as normalizeSingleNasBase
} from "./normalize-nas-paths-lib.mjs";

const config = {
  baseAppToken: process.env.NAS_CLEAN_BASE_APP_TOKEN || "KhLGbYdBwa49ufswb1WcuyQznKe",
  tableId: process.env.NAS_CLEAN_TABLE_ID || "tbltRiGGsqxuPKVE",
  viewId: process.env.NAS_CLEAN_VIEW_ID || "",
  fieldName: process.env.NAS_CLEAN_FIELD || "nas_material_url",
  batchSize: Number(process.env.NAS_CLEAN_BATCH_SIZE || 100),
  dryRun: process.env.NAS_CLEAN_DRY_RUN !== "false"
};

const stats = {
  scannedRows: 0,
  emptyRows: 0,
  unchangedRows: 0,
  updatedRows: 0,
  multiValueRows: 0,
  richIpRows: 0,
  plainIpRows: 0,
  smbRows: 0,
  windowsRows: 0,
  systemVolumesRows: 0,
  normalizedVolumesRows: 0
};

function valueToString(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(valueToString).filter(Boolean).join("");
  if (typeof value === "object") return valueToString(value.text || value.link || value.url || "");
  return String(value);
}

function standardizeNasField(raw) {
  const input = valueToString(raw).trim();
  if (!input) return "";

  const parts = splitNasValues(input);
  if (parts.length > 1) stats.multiValueRows++;

  const normalized = [...new Set(parts.map(normalizeSingleNas).filter(Boolean))];
  return normalized.join(",");
}

function splitNasValues(value) {
  return String(value)
    .split(/[,，;\n；]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeSingleNas(value) {
  const raw = String(value).trim();
  if (!raw) return "";

  let cleaned = raw.replace(/^['"]+|['"]+$/g, "");

  if (/^\/\/\[\d{1,3}(?:\.\d{1,3}){3}\/?\]\(https?:\/\/[^\)]+\)/i.test(cleaned)) {
    stats.richIpRows++;
  } else if (/^\[\d{1,3}(?:\.\d{1,3}){3}\/?\]\(https?:\/\/[^\)]+\)/i.test(cleaned)) {
    stats.richIpRows++;
  } else if (/^\/{2}\d{1,3}(?:\.\d{1,3}){3}\//.test(cleaned)) {
    stats.plainIpRows++;
  }

  cleaned = cleaned.replace(/^nas_material_url\s*[:=：]\s*/i, "");
  if (/^\/System\/Volumes\/Data\/Volumes\//i.test(cleaned)) {
    stats.systemVolumesRows++;
  } else if (/^\/Volumes\//i.test(cleaned)) {
    stats.normalizedVolumesRows++;
  } else if (/^smb:\/\//i.test(cleaned)) {
    stats.smbRows++;
  } else if (/^\\\\/.test(cleaned)) {
    stats.windowsRows++;
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}\//.test(cleaned)) {
    stats.plainIpRows++;
  }

  return normalizeSingleNasBase(value);
}

async function getToken() {
  const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: requiredEnv("FEISHU_APP_ID"),
      app_secret: requiredEnv("FEISHU_APP_SECRET")
    })
  });
  const data = await response.json();
  if (data.code !== 0) throw new Error(`Feishu token failed: ${data.msg || data.code}`);
  return data.tenant_access_token;
}

async function listRecords(token) {
  const records = [];
  let pageToken = "";

  do {
    const url = buildRecordsUrl({
      baseAppToken: config.baseAppToken,
      tableId: config.tableId,
      viewId: config.viewId,
      pageToken
    });

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (data.code !== 0) throw new Error(`Feishu list failed: ${data.msg || data.code}`);

    records.push(...data.data.items.map((item) => ({ record_id: item.record_id, fields: item.fields || {} })));
    pageToken = data.data.has_more ? data.data.page_token || "" : "";

    if (records.length % 5000 === 0) {
      console.log(`已读取 ${records.length} 行...`);
    }
  } while (pageToken);

  return records;
}

function buildUpdates(records) {
  const updates = [];
  const preview = [];

  for (const record of records) {
    stats.scannedRows++;
    const before = valueToString(record.fields[config.fieldName]).trim();
    if (!before) {
      stats.emptyRows++;
      continue;
    }

    const after = standardizeNasField(before);
    if (!after || after === before) {
      stats.unchangedRows++;
      continue;
    }

    stats.updatedRows++;
    updates.push({ record_id: record.record_id, value: after });
    if (preview.length < 20) {
      preview.push({ record_id: record.record_id, before, after });
    }
  }

  return { updates, preview };
}

async function batchUpdate(token, updates) {
  let updated = 0;

  for (let index = 0; index < updates.length; index += config.batchSize) {
    const chunk = updates.slice(index, index + config.batchSize);
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.baseAppToken}/tables/${config.tableId}/records/batch_update`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          records: chunk.map((item) => ({
            record_id: item.record_id,
            fields: {
              [config.fieldName]: buildFieldValue(item.value)
            }
          }))
        })
      }
    );
    const data = await response.json();
    if (data.code !== 0) throw new Error(`Feishu batch update failed at ${index}: ${data.msg || data.code}`);
    updated += chunk.length;
    console.log(`已写入 ${updated}/${updates.length} 行...`);
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const token = await getToken();
console.log(`开始读取表 ${config.baseAppToken}/${config.tableId} 的 ${config.fieldName}...`);
const records = await listRecords(token);
const { updates, preview } = buildUpdates(records);

console.log(
  JSON.stringify(
    {
      dryRun: config.dryRun,
      table: `${config.baseAppToken}/${config.tableId}`,
      viewId: config.viewId || null,
      fieldName: config.fieldName,
      ...stats,
      preview
    },
    null,
    2
  )
);

if (!config.dryRun && updates.length > 0) {
  await batchUpdate(token, updates);
}
