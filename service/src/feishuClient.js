export function createFeishuClient(config, fetchImpl = fetch) {
  let cachedTenantToken = null;
  let cachedTenantTokenExpiresAt = 0;
  const cachedRecordsByTable = new Map();

  async function getTenantToken() {
    if (cachedTenantToken && Date.now() < cachedTenantTokenExpiresAt) {
      return cachedTenantToken;
    }

    const response = await fetchImpl("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: config.feishuAppId,
        app_secret: config.feishuAppSecret
      })
    });

    if (!response.ok) {
      throw new Error(`Feishu token request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`Feishu token request failed: ${data.msg || data.code}`);
    }

    cachedTenantToken = data.tenant_access_token;
    cachedTenantTokenExpiresAt = Date.now() + Math.max(60, data.expire - 60) * 1000;
    return cachedTenantToken;
  }

  async function listTableRecords(tableId) {
    const cachedRecords = cachedRecordsByTable.get(tableId);
    if (cachedRecords && Date.now() < cachedRecords.expiresAt) {
      return cachedRecords.records;
    }

    const token = await getTenantToken();
    const records = [];
    let pageToken = "";

    do {
      const url = new URL(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishuBaseAppToken}/tables/${tableId}/records`
      );
      url.searchParams.set("page_size", "500");
      if (pageToken) {
        url.searchParams.set("page_token", pageToken);
      }

      const response = await fetchImpl(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Feishu records request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.code !== 0) {
        throw new Error(`Feishu records request failed: ${data.msg || data.code}`);
      }

      records.push(
        ...data.data.items.map((item) => ({
          ...item.fields,
          __recordId: item.record_id
        }))
      );
      pageToken = data.data.has_more ? data.data.page_token || "" : "";
    } while (pageToken);

    cachedRecordsByTable.set(tableId, {
      records,
      expiresAt: Date.now() + 60 * 1000
    });

    return records;
  }

  async function searchTableRecords(tableId, { productSlug }) {
    const token = await getTenantToken();
    const url = new URL(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishuBaseAppToken}/tables/${tableId}/records/search`
    );
    url.searchParams.set("page_size", "500");

    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filter: {
          conjunction: "and",
          conditions: [{ field_name: "product_url", operator: "contains", value: [productSlug] }]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Feishu records search failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`Feishu records search failed: ${data.msg || data.code}`);
    }

    return data.data.items.map((item) => ({
      ...item.fields,
      __recordId: item.record_id
    }));
  }

  return {
    listBindings: () => listTableRecords(config.feishuBindingsTableId),
    searchBindings: ({ productSlug, pageUrl }) => searchTableRecords(config.feishuBindingsTableId, { productSlug, pageUrl })
  };
}
