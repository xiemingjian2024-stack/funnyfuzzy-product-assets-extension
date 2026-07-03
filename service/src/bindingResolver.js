export function resolveBinding({ productSlug, pageUrl, siteDomain, bindings, bindingSheetUrl = "", skuSheetUrl = "", includeRecordLink = true }) {
  const activeBindings = bindings.filter((binding) => isActive(binding.status));
  const normalizedPageUrl = normalizeUrl(pageUrl);
  const exactUrlMatches = normalizedPageUrl
    ? activeBindings.filter((binding) => bindingHasUrl(binding, normalizedPageUrl))
    : [];
  const activeMatches =
    exactUrlMatches.length > 0
      ? exactUrlMatches
      : activeBindings.filter(
          (binding) =>
            valueToString(binding.product_slug) === productSlug &&
            (!siteDomain || !valueToString(binding.site_domain) || valueToString(binding.site_domain) === siteDomain)
        );

  if (activeMatches.length === 0) {
    return { state: "unbound" };
  }

  const items = dedupeBindings(activeMatches).map((binding) =>
    buildBindingItem({ binding, bindingSheetUrl, skuSheetUrl, includeRecordLink })
  );
  const firstItem = items[0];

  const result = {
    state: "bound",
    items,
    productName: firstItem.productName,
    assetGroupName: firstItem.assetGroupName,
    nasMaterialUrl: firstItem.nasMaterialUrl,
    nasMaterialUrls: uniqueValues(items.flatMap((item) => item.nasMaterialUrls || [])),
    skuSheetUrl: firstItem.skuSheetUrl,
    bindingSheetUrl: firstItem.bindingSheetUrl
  };

  if (firstItem.spuName) {
    result.spuName = firstItem.spuName;
  }

  return result;
}

function valueToString(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(valueToString).filter(Boolean).join("");
  if (typeof value === "object" && "link" in value) return valueToString(value.link);
  if (typeof value === "object" && "url" in value) return valueToString(value.url);
  if (typeof value === "object" && "text" in value) return valueToString(value.text);
  return String(value);
}

function isActive(value) {
  const status = valueToString(value).toLowerCase();
  return !status || status === "active";
}

function normalizeUrl(value) {
  const raw = valueToString(value).trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    url.hash = "";
    url.search = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return raw.replace(/[?#].*$/, "").replace(/\/$/, "");
  }
}

function bindingHasUrl(binding, normalizedPageUrl) {
  return getProductUrls(binding).some((url) => normalizeUrl(url) === normalizedPageUrl);
}

function getProductUrls(binding) {
  return extractUrls(binding.product_url || binding.page_url);
}

function getNasPaths(binding) {
  return extractDelimitedValues(binding.nas_material_url);
}

function extractUrls(value) {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.flatMap(extractUrls).filter(Boolean);
  }

  if (typeof value === "object") {
    return extractUrls(value.link || value.url || value.text || "");
  }

  const raw = String(value).trim();
  if (!raw) return [];

  const urlMatches = raw.match(/https?:\/\/[^\s,，]+/g);
  if (urlMatches) return urlMatches;

  return raw
    .split(/[,，;\n；]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractDelimitedValues(value) {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return uniqueValues(value.flatMap(extractDelimitedValues));
  }

  if (typeof value === "object") {
    return extractDelimitedValues(value.link || value.url || value.text || "");
  }

  return uniqueValues(
    String(value)
      .split(/[,，;\n；]+/)
      .map((part) => part.trim())
      .filter(Boolean)
  );
}

function dedupeBindings(bindings) {
  const bySpu = new Map();

  for (const binding of bindings) {
    const spu = valueToString(binding.SPU || binding.spu).trim();
    const key = spu || valueToString(binding.__recordId) || JSON.stringify(binding);
    const current = bySpu.get(key);

    if (!current) {
      bySpu.set(key, binding);
      continue;
    }

    bySpu.set(key, mergeBinding(current, binding));
  }

  return [...bySpu.values()].sort((a, b) => valueToString(a.SPU || a.spu).localeCompare(valueToString(b.SPU || b.spu)));
}

function mergeBinding(primary, secondary) {
  return {
    ...secondary,
    ...primary,
    nas_material_url: valueToString(primary.nas_material_url) || valueToString(secondary.nas_material_url),
    sku_sheet_url: valueToString(primary.sku_sheet_url) || valueToString(secondary.sku_sheet_url),
    binding_sheet_url: valueToString(primary.binding_sheet_url) || valueToString(secondary.binding_sheet_url),
    __recordId: valueToString(primary.__recordId) || valueToString(secondary.__recordId)
  };
}

function buildBindingItem({ binding, bindingSheetUrl, skuSheetUrl, includeRecordLink }) {
  const productName = valueToString(binding.product_name || binding.product_title || binding["英文标题"] || binding["产品名称"] || binding.SPU);
  const spuName = buildSpuName(binding);
  const nasMaterialUrls = getNasPaths(binding);
  const item = {
    productName,
    assetGroupName: productName,
    nasMaterialUrl: nasMaterialUrls[0] || "",
    nasMaterialUrls,
    skuSheetUrl: valueToString(binding.sku_sheet_url) || buildSheetUrl(skuSheetUrl || bindingSheetUrl, binding.__recordId, includeRecordLink),
    bindingSheetUrl: valueToString(binding.binding_sheet_url) || bindingSheetUrl
  };

  if (spuName) {
    item.spuName = spuName;
  }

  return item;
}

function buildSpuName(binding) {
  const spu = valueToString(binding.SPU || binding.spu);
  const chineseSpu = valueToString(binding["中文SPU"] || binding.spu_name || binding.spuName);
  return [spu, chineseSpu].filter(Boolean).join(" · ");
}

function buildRecordUrl(baseUrl, recordId) {
  const cleanBaseUrl = valueToString(baseUrl);
  const cleanRecordId = valueToString(recordId);
  if (!cleanBaseUrl || !cleanRecordId) return "";

  try {
    const url = new URL(cleanBaseUrl);
    url.searchParams.set("record", cleanRecordId);
    return url.href;
  } catch {
    const separator = cleanBaseUrl.includes("?") ? "&" : "?";
    return `${cleanBaseUrl}${separator}record=${encodeURIComponent(cleanRecordId)}`;
  }
}

function buildSheetUrl(baseUrl, recordId, includeRecordLink) {
  const cleanBaseUrl = valueToString(baseUrl);
  if (!includeRecordLink) return cleanBaseUrl;
  return buildRecordUrl(cleanBaseUrl, recordId);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}
