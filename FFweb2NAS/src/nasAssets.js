const IMAGE_LABEL = "图片素材";
const VIDEO_LABEL = "视频素材";

export function parseNasAssetLinks(values) {
  if (!Array.isArray(values)) return [];

  const parsed = values
    .map(parseNasAsset)
    .filter(Boolean)
    .sort((left, right) => assetOrder(left.type) - assetOrder(right.type));

  const seen = new Set();
  return parsed.filter((item) => {
    const key = `${item.type}:${item.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseNasAsset(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const tagged = raw.match(/^(video|image)\s*:\s*(.*)$/i);
  const type = tagged ? tagged[1].toLowerCase() : "image";
  const path = (tagged ? tagged[2] : raw).trim();
  if (!path) return null;

  return {
    type,
    path,
    label: type === "video" ? VIDEO_LABEL : IMAGE_LABEL
  };
}

function assetOrder(type) {
  return type === "video" ? 1 : 0;
}
