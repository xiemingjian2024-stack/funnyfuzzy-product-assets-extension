import "dotenv/config";

export function loadServiceConfig() {
  return {
    port: Number(process.env.PORT || 8787),
    extensionAccessToken: required("EXTENSION_ACCESS_TOKEN"),
    feishuAppId: required("FEISHU_APP_ID"),
    feishuAppSecret: required("FEISHU_APP_SECRET"),
    feishuBaseAppToken: required("FEISHU_BASE_APP_TOKEN"),
    feishuBindingsTableId: required("FEISHU_BINDINGS_TABLE_ID"),
    bindingSheetUrl: process.env.BINDING_SHEET_URL || "",
    skuSheetUrl: process.env.SPU_SHEET_URL || process.env.BINDING_SHEET_URL || "",
    includeRecordLink: process.env.INCLUDE_RECORD_LINK !== "false"
  };
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}
