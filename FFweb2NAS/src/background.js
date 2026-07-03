chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "FF_ASSETS_LOOKUP") {
    return false;
  }

  fetchAssetBinding(message.payload)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message || "获取失败" }));

  return true;
});

async function fetchAssetBinding({ settings, product }) {
  const url = new URL("/api/assets/lookup", settings.serviceUrl);
  url.searchParams.set("product_slug", product.productSlug);
  url.searchParams.set("site_domain", product.siteDomain);
  url.searchParams.set("page_url", product.pageUrl);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${settings.extensionAccessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`查询服务返回 ${response.status}`);
  }

  return response.json();
}
