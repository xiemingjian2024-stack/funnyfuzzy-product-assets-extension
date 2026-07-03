import "dotenv/config";

const config = {
  baseAppToken: process.env.FILL_BASE_APP_TOKEN || "Zp8FbWjxfai4zSsmqNJc8aTbnRf",
  tableId: process.env.FILL_TABLE_ID || "tblPi1SL1OzsArpa",
  siteOrigin: process.env.FILL_SITE_ORIGIN || "https://funnyfuzzy.com",
  batchSize: Number(process.env.FILL_BATCH_SIZE || 100),
  recordLimit: Number(process.env.FILL_RECORD_LIMIT || 0),
  concurrency: Number(process.env.FILL_CONCURRENCY || 8),
  dryRun: process.env.FILL_DRY_RUN === "true"
};

const stats = {
  scannedRows: 0,
  scannedSpus: 0,
  skippedExistingRows: 0,
  fromExistingSpu: 0,
  fromVerifiedTitle: 0,
  fromVerifiedSku: 0,
  unresolvedSpus: 0,
  conflictSpus: 0,
  updateRows: 0
};

function valueToString(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(valueToString).filter(Boolean).join("");
  if (typeof value === "object" && "link" in value) return valueToString(value.link);
  if (typeof value === "object" && "url" in value) return valueToString(value.url);
  if (typeof value === "object" && "text" in value) return valueToString(value.text);
  return String(value);
}

function normalizeProductUrl(raw) {
  const value = valueToString(raw).trim().replace(/^['"]+|['"]+$/g, "");
  if (!value) return "";

  try {
    const url = new URL(value, config.siteOrigin);
    if (!url.pathname.startsWith("/products/")) return "";
    url.search = "";
    url.hash = "";
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return "";
  }
}

function normalizeTitle(title) {
  return valueToString(title)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(title) {
  return normalizeTitle(title).replace(/\s+/g, "-");
}

function mostFrequentTitle(rows) {
  return mostFrequentFieldValue(rows, "英文标题");
}

function mostFrequentFieldValue(rows, fieldName) {
  const counts = new Map();

  for (const row of rows) {
    const value = valueToString(row.fields[fieldName]).trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0]?.[0] || "";
}

function mostFrequentSkuValues(rows, limit = 5) {
  const counts = new Map();

  for (const row of rows) {
    const sku = normalizeSku(row.fields.SKU);
    if (!sku) continue;
    counts.set(sku, (counts.get(sku) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([sku]) => sku);
}

function normalizeSku(value) {
  return valueToString(value).trim().toUpperCase().replace(/\s+/g, "");
}

function linkField(url) {
  return { text: url, link: url };
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
  let page = 0;

  do {
    page++;
    const remaining = config.recordLimit > 0 ? config.recordLimit - records.length : 500;
    const pageSize = Math.min(500, remaining);
    if (pageSize <= 0) break;

    const url = new URL(`https://open.feishu.cn/open-apis/bitable/v1/apps/${config.baseAppToken}/tables/${config.tableId}/records`);
    url.searchParams.set("page_size", String(pageSize));
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (data.code !== 0) throw new Error(`Feishu list failed on page ${page}: ${data.msg || data.code}`);

    records.push(...data.data.items.map((item) => ({ record_id: item.record_id, fields: item.fields || {} })));
    pageToken = data.data.has_more ? data.data.page_token || "" : "";

    if (page % 10 === 0) {
      console.log(`已读取 ${records.length} 行...`);
    }
  } while (pageToken && (config.recordLimit <= 0 || records.length < config.recordLimit));

  return records;
}

const generatedUrlCache = new Map();
async function verifyGeneratedUrl(title) {
  const generated = `${config.siteOrigin}/products/${slugify(title)}`;
  if (generatedUrlCache.has(generated)) return generatedUrlCache.get(generated);

  let result = "";
  try {
    const response = await fetch(generated, { method: "HEAD", redirect: "follow" });
    if (response.status === 200) result = normalizeProductUrl(response.url || generated);
  } catch {
    // Some product pages block HEAD, so fall back to GET below.
  }

  if (!result) {
    try {
      const response = await fetch(generated, { method: "GET", redirect: "follow" });
      if (response.status === 200) result = normalizeProductUrl(response.url || generated);
    } catch {
      result = "";
    }
  }

  generatedUrlCache.set(generated, result);
  return result;
}

const searchCache = new Map();
async function searchExactProductUrl(title) {
  const normalized = normalizeTitle(title);
  if (!normalized) return "";
  if (searchCache.has(normalized)) return searchCache.get(normalized);

  let result = "";
  try {
    const url = new URL(`${config.siteOrigin}/search/suggest.json`);
    url.searchParams.set("q", title);
    url.searchParams.set("resources[type]", "product");
    url.searchParams.set("resources[limit]", "10");

    const response = await fetch(url);
    const data = await response.json();
    const products = data.resources?.results?.products || [];
    const uniqueUrls = [
      ...new Set(
        products
          .filter((product) => normalizeTitle(product.title) === normalized)
          .map((product) => normalizeProductUrl(product.url))
          .filter(Boolean)
      )
    ];

    if (uniqueUrls.length === 1) {
      result = uniqueUrls[0];
    }
  } catch {
    result = "";
  }

  searchCache.set(normalized, result);
  return result;
}

const skuSearchCache = new Map();
async function searchProductUrlsBySku(sku) {
  const normalizedSku = normalizeSku(sku);
  if (!normalizedSku) return [];
  if (skuSearchCache.has(normalizedSku)) return skuSearchCache.get(normalizedSku);

  let result = [];
  try {
    const url = new URL(`${config.siteOrigin}/search/suggest.json`);
    url.searchParams.set("q", normalizedSku);
    url.searchParams.set("resources[type]", "product");
    url.searchParams.set("resources[limit]", "10");
    url.searchParams.set("resources[options][unavailable_products]", "show");
    url.searchParams.set("resources[options][fields]", "title,variants.sku");

    const response = await fetch(url);
    const data = await response.json();
    const products = data.resources?.results?.products || [];
    result = [...new Set(products.map((product) => normalizeProductUrl(product.url)).filter(Boolean))];
  } catch {
    result = [];
  }

  skuSearchCache.set(normalizedSku, result);
  return result;
}

const productSkuCache = new Map();
async function productContainsSku(productUrl, sku) {
  const normalizedUrl = normalizeProductUrl(productUrl);
  const normalizedSku = normalizeSku(sku);
  if (!normalizedUrl || !normalizedSku) return false;

  if (!productSkuCache.has(normalizedUrl)) {
    let skus = [];
    try {
      const data = await fetch(`${normalizedUrl}.js`).then((response) => response.json());
      skus = (data.variants || []).map((variant) => normalizeSku(variant.sku)).filter(Boolean);
    } catch {
      skus = [];
    }
    productSkuCache.set(normalizedUrl, new Set(skus));
  }

  return productSkuCache.get(normalizedUrl).has(normalizedSku);
}

async function resolveUrlForSku(rows) {
  for (const sku of mostFrequentSkuValues(rows)) {
    const candidateUrls = await searchProductUrlsBySku(sku);
    const verifiedUrls = [];

    for (const candidateUrl of candidateUrls) {
      if (await productContainsSku(candidateUrl, sku)) {
        verifiedUrls.push(candidateUrl);
      }
    }

    const uniqueUrls = [...new Set(verifiedUrls)];
    if (uniqueUrls.length === 1) return uniqueUrls[0];
  }

  return "";
}

async function resolveUrlForTitle(title) {
  if (!title) return "";
  return (await verifyGeneratedUrl(title)) || (await searchExactProductUrl(title));
}

async function buildUpdates(records) {
  const bySpu = new Map();

  for (const record of records) {
    const spu = valueToString(record.fields.SPU).trim();
    if (!spu) continue;
    if (!bySpu.has(spu)) bySpu.set(spu, []);
    bySpu.get(spu).push(record);
  }

  stats.scannedRows = records.length;
  stats.scannedSpus = bySpu.size;

  const entries = [...bySpu.entries()];
  const results = [];
  let nextIndex = 0;
  let processedSpus = 0;

  async function processEntry(spu, rows) {
    const missingRows = rows.filter((row) => !normalizeProductUrl(row.fields.product_url));
    const skippedExistingRows = rows.length - missingRows.length;
    if (missingRows.length === 0) {
      return { updates: [], unresolved: null, conflict: null, skippedExistingRows, fromExistingSpu: 0, fromVerifiedTitle: 0, fromVerifiedSku: 0 };
    }

    const existingUrls = [...new Set(rows.map((row) => normalizeProductUrl(row.fields.product_url)).filter(Boolean))];
    if (existingUrls.length === 1) {
      return {
        updates: missingRows.map((row) => ({ record_id: row.record_id, spu, product_url: existingUrls[0], reason: "same_spu_existing_url" })),
        unresolved: null,
        conflict: null,
        skippedExistingRows,
        fromExistingSpu: missingRows.length,
        fromVerifiedTitle: 0,
        fromVerifiedSku: 0
      };
    }

    if (existingUrls.length > 1) {
      return { updates: [], unresolved: null, conflict: { spu, existingUrls }, skippedExistingRows, fromExistingSpu: 0, fromVerifiedTitle: 0, fromVerifiedSku: 0 };
    }

    const title = mostFrequentTitle(rows);
    const resolvedUrl = await resolveUrlForTitle(title);
    if (resolvedUrl) {
      return {
        updates: missingRows.map((row) => ({ record_id: row.record_id, spu, product_url: resolvedUrl, reason: "verified_title_url" })),
        unresolved: null,
        conflict: null,
        skippedExistingRows,
        fromExistingSpu: 0,
        fromVerifiedTitle: missingRows.length,
        fromVerifiedSku: 0
      };
    }

    const skuResolvedUrl = await resolveUrlForSku(rows);
    if (skuResolvedUrl) {
      return {
        updates: missingRows.map((row) => ({ record_id: row.record_id, spu, product_url: skuResolvedUrl, reason: "verified_sku_url" })),
        unresolved: null,
        conflict: null,
        skippedExistingRows,
        fromExistingSpu: 0,
        fromVerifiedTitle: 0,
        fromVerifiedSku: missingRows.length
      };
    }

    return { updates: [], unresolved: { spu, rows: rows.length, title }, conflict: null, skippedExistingRows, fromExistingSpu: 0, fromVerifiedTitle: 0, fromVerifiedSku: 0 };
  }

  async function worker() {
    while (nextIndex < entries.length) {
      const index = nextIndex++;
      const [spu, rows] = entries[index];
      const result = await processEntry(spu, rows);
      results.push(result);

      processedSpus++;
      if (processedSpus % 100 === 0) {
        const updateRows = results.reduce((sum, item) => sum + item.updates.length, 0);
        console.log(`已处理 ${processedSpus}/${bySpu.size} 个 SPU，待写入 ${updateRows} 行...`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, config.concurrency) }, () => worker()));

  const updates = results.flatMap((result) => result.updates);
  const unresolved = results.map((result) => result.unresolved).filter(Boolean);
  const conflicts = results.map((result) => result.conflict).filter(Boolean);
  stats.skippedExistingRows = results.reduce((sum, result) => sum + result.skippedExistingRows, 0);
  stats.fromExistingSpu = results.reduce((sum, result) => sum + result.fromExistingSpu, 0);
  stats.fromVerifiedTitle = results.reduce((sum, result) => sum + result.fromVerifiedTitle, 0);
  stats.fromVerifiedSku = results.reduce((sum, result) => sum + result.fromVerifiedSku, 0);
  stats.unresolvedSpus = unresolved.length;
  stats.conflictSpus = conflicts.length;
  stats.updateRows = updates.length;
  return { updates, unresolved, conflicts };
}

async function batchUpdate(token, updates) {
  let updated = 0;

  for (let i = 0; i < updates.length; i += config.batchSize) {
    const chunk = updates.slice(i, i + config.batchSize);
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
            fields: { product_url: linkField(item.product_url) }
          }))
        })
      }
    );
    const data = await response.json();
    if (data.code !== 0) throw new Error(`Feishu batch update failed at ${i}: ${data.msg || data.code}`);

    updated += chunk.length;
    console.log(`已写入 ${updated}/${updates.length} 行...`);
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const startedAt = Date.now();
const token = await getToken();
console.log(`开始读取备份表 ${config.baseAppToken}/${config.tableId}...`);
const records = await listRecords(token);
console.log(`读取完成：${records.length} 行，开始计算可填充 URL...`);
const { updates, unresolved, conflicts } = await buildUpdates(records);

console.log(
  JSON.stringify(
    {
      dryRun: config.dryRun,
      ...stats,
      unresolvedPreview: unresolved.slice(0, 20),
      conflictPreview: conflicts.slice(0, 10),
      updatePreview: updates.slice(0, 20).map(({ spu, product_url, reason }) => ({ spu, product_url, reason }))
    },
    null,
    2
  )
);

if (!config.dryRun && updates.length > 0) {
  await batchUpdate(token, updates);
}

console.log(`完成，用时 ${Math.round((Date.now() - startedAt) / 1000)} 秒`);
