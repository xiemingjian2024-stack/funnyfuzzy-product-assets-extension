export async function fetchAssetBinding({ settings, product }) {
  const response = await chrome.runtime.sendMessage({
    type: "FF_ASSETS_LOOKUP",
    payload: { settings, product }
  });

  if (!response?.ok) {
    throw new Error(response?.error || "获取失败");
  }

  return response.data;
}
