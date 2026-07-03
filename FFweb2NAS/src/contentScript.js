import { fetchAssetBinding } from "./apiClient.js";
import { loadSettings } from "./config.js";
import { formatNasNavigationTarget, formatNasPathForPlatform } from "./nasPath.js";
import { renderAssetsPanel, showPanelMessage } from "./panel.js";
import { detectProductPage } from "./productPage.js";

const NAS_FEEDBACK_URL = "https://funnyfuzzy.feishu.cn/wiki/KLCvwwUoli0aXCkhE6hcAvOPnkd?from=from_copylink";

main().catch((error) => {
  renderAssetsPanel({
    state: "error",
    message: `内部素材加载失败：${error.message}`,
    onContactAdmin: () => copyAdminDiagnostic({ error })
  });
});

async function main() {
  const settings = await loadSettings();
  const product = detectProductPage({
    href: window.location.href,
    hostname: window.location.hostname,
    document
  });

  if (!product.isProductPage || !settings.allowedDomains.includes(product.siteDomain)) {
    return;
  }

  if (!settings.serviceUrl || !settings.extensionAccessToken) {
    renderAssetsPanel({
      state: "error",
      message: "内部素材插件未完成设置"
    });
    return;
  }

  renderAssetsPanel({
    state: "loading",
    bindingSheetUrl: settings.bindingSheetUrl,
    onOpenBinding: () => window.open(settings.bindingSheetUrl, "_blank", "noopener")
  });

  let result;
  try {
    result = await fetchAssetBinding({ settings, product });
  } catch (error) {
    renderAssetsPanel({
      state: "error",
      message: `内部素材加载失败：${error.message}`,
      bindingSheetUrl: settings.bindingSheetUrl,
      onOpenBinding: () => window.open(settings.bindingSheetUrl, "_blank", "noopener"),
      onContactAdmin: () => copyAdminDiagnostic({ error, settings, product })
    });
    return;
  }

  if (result.state === "bound") {
    const items = Array.isArray(result.items) && result.items.length > 0 ? result.items : [result];
    const nasMaterialUrls = [...new Set(items.flatMap((item) => item.nasMaterialUrls || (item.nasMaterialUrl ? [item.nasMaterialUrl] : [])))];
    const nasMaterialUrl = nasMaterialUrls[0] || result.nasMaterialUrl || "";

    renderAssetsPanel({
      ...result,
      items,
      nasMaterialUrls,
      nasMaterialUrl,
      nasFeedbackUrl: NAS_FEEDBACK_URL,
      onCopySpu: copySpu,
      onOpenNas: (asset = { path: nasMaterialUrl, type: "image" }) => openNas(asset),
      onOpenNasFeedback: () => window.open(NAS_FEEDBACK_URL, "_blank", "noopener"),
      onOpenSku: (item = result) => openSku(item.skuSheetUrl || result.skuSheetUrl, item.spuName || result.spuName),
    });
    return;
  }

  if (result.state === "unbound") {
    renderAssetsPanel({
      state: "unbound",
      nasFeedbackUrl: NAS_FEEDBACK_URL,
      onOpenNasFeedback: () => window.open(NAS_FEEDBACK_URL, "_blank", "noopener")
    });
    return;
  }

  renderAssetsPanel({
    state: "error",
    message: result.message || "内部素材信息暂时不可用",
    bindingSheetUrl: settings.bindingSheetUrl,
    onOpenBinding: () => window.open(settings.bindingSheetUrl, "_blank", "noopener"),
    onContactAdmin: () => copyAdminDiagnostic({ message: result.message, settings, product })
  });
}

async function copySpu(spuCode) {
  try {
    await navigator.clipboard.writeText(spuCode);
    showPanelMessage(`已复制 ${spuCode}`);
  } catch {
    showPanelMessage(`复制失败，请手动复制 ${spuCode}`);
  }
}

async function openSku(skuUrl, spuName) {
  const spuCode = extractSpuCode(spuName);
  let copied = false;

  if (spuCode) {
    try {
      await navigator.clipboard.writeText(spuCode);
      copied = true;
    } catch {
      copied = false;
    }
  }

  window.open(skuUrl, "_blank", "noopener");

  if (copied) {
    showPanelMessage(`已复制 ${spuCode}，可在新表中搜索定位。`);
    return;
  }

  showPanelMessage(spuCode ? `请在新表中搜索 ${spuCode}。` : "已打开新表，请搜索当前 SPU。");
}

async function openNas(asset) {
  const nasUrl = typeof asset === "string" ? asset : asset?.path;
  const assetLabel = asset?.type === "video" ? "视频素材" : "图片素材";
  const platformNasPath = formatNasPathForPlatform(nasUrl);
  const navigationTarget = formatNasNavigationTarget(nasUrl);
  if (!platformNasPath) {
    showPanelMessage("未找到可用的 NAS 路径，请检查表格中的素材地址。");
    return;
  }

  try {
    await navigator.clipboard.writeText(platformNasPath);
  } catch {
    showPanelMessage("NAS 路径复制失败，请联系管理员。");
    return;
  }

  try {
    window.location.href = navigationTarget || platformNasPath;
    showPanelMessage(`正在尝试打开${assetLabel}，并已复制当前系统可用路径。若未自动打开，请粘贴到 Finder 或文件资源管理器地址栏。`);
  } catch {
    showPanelMessage(`已复制${assetLabel}路径。若未自动打开，请粘贴到 Finder 或文件资源管理器地址栏。`);
  }
}

function extractSpuCode(value) {
  return String(value || "")
    .split("·")[0]
    .trim();
}

async function copyAdminDiagnostic({ error, message, settings, product }) {
  const details = [
    "FunnyFuzzy 内部素材获取失败",
    `页面：${window.location.href}`,
    `产品路径：${product?.productSlug || ""}`,
    `官网域名：${product?.siteDomain || window.location.hostname}`,
    `服务地址：${settings?.serviceUrl || ""}`,
    `绑定表：${settings?.bindingSheetUrl || ""}`,
    `错误信息：${error?.message || message || ""}`,
    `时间：${new Date().toISOString()}`
  ].join("\n");

  await navigator.clipboard.writeText(details);
  showPanelMessage("已复制错误信息，请发送给管理员。");
}
