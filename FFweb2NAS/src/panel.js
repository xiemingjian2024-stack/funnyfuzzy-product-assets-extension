import { parseNasAssetLinks } from "./nasAssets.js";

const IMAGE_ICON_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><g clip-path="url(#ff-assets-image-icon-clip)"><path d="M5.10302 2.27026H19.3659C20.7922 2.27026 21.9591 3.43723 21.9591 4.86351V19.1264C21.9591 20.5527 20.7922 21.7196 19.3659 21.7196H5.10302C3.67673 21.7196 2.50977 20.5527 2.50977 19.1264V4.86351C2.50977 3.43723 3.67673 2.27026 5.10302 2.27026ZM16.1243 10.05C17.1616 10.05 18.0693 9.14238 18.0693 8.10508C18.0693 7.06778 17.1616 6.16014 16.1243 6.16014C15.087 6.16014 14.1794 7.06778 14.1794 8.10508C14.1794 9.14238 15.087 10.05 16.1243 10.05ZM10.9378 15.1069L9.6412 13.0323C9.6412 12.9026 9.51154 12.9026 9.38188 12.7729C8.99289 12.6433 8.6039 12.6433 8.47424 13.0323L5.10302 18.2188V18.4781C5.10302 18.8671 5.36234 19.1264 5.75133 19.1264H18.9769C19.2362 19.1264 19.4956 18.8671 19.4956 18.6077C19.4956 18.4781 19.4956 18.3484 19.3659 18.3484L16.5133 14.3289C16.3837 14.0696 15.9947 14.0696 15.7353 14.1992L15.6057 14.3289L15.3464 14.5882L13.5311 17.4408C13.2718 17.7001 12.8828 17.8298 12.6234 17.5704C12.4938 17.5704 12.4938 17.4408 12.4938 17.3111L10.9378 15.1069Z" fill="currentColor"/></g><defs><clipPath id="ff-assets-image-icon-clip"><rect width="19.4494" height="19.4494" fill="white" transform="translate(2.50977 2.27026)"/></clipPath></defs></svg>`;
const VIDEO_ICON_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.9702 5.91994L8.02024 2.43994H4.67023L7.62023 5.90994H10.9702V5.91994ZM19.6602 5.91994L16.7102 2.44994H13.3602L16.3202 5.91994H19.6602ZM15.3202 5.91994L12.3702 2.44994H9.02023L11.9702 5.91994H15.3202ZM20.9202 2.43994H17.7102L20.6702 5.90994H22.2302V3.74994C22.2202 3.00994 21.6602 2.43994 20.9202 2.43994ZM3.67023 2.43994H3.54023C2.80023 2.43994 2.24023 2.99994 2.24023 3.73994V5.90994H6.63023L3.67023 2.43994ZM2.24023 20.2499C2.24023 20.9899 2.80023 21.5499 3.54023 21.5499H20.9202C21.6602 21.5499 22.2202 20.9899 22.2202 20.2499V6.78994H2.24023V20.2499ZM9.19023 10.6999C9.19023 9.95994 9.80024 9.60994 10.4902 9.60994C10.7102 9.60994 10.9702 9.64994 11.1902 9.77994L16.1402 12.6499C16.7402 12.9699 16.9702 13.7099 16.6502 14.3099C16.5402 14.5299 16.3602 14.6999 16.1402 14.8199L11.1902 17.6899C10.9702 17.8199 10.7602 17.8599 10.4902 17.8599C9.79023 17.8599 9.19023 17.5099 9.19023 16.7699V10.6999Z" fill="currentColor"/></svg>`;

export function renderAssetsPanel(props) {
  removeExistingPanel();

  const panel = document.createElement("aside");
  panel.dataset.ffAssetsPanel = "true";
  panel.className = "ff-assets-panel";
  if (loadCollapsedState()) {
    panel.classList.add("ff-assets-panel--collapsed");
  }

  const toggleButton = createButton("›", () => togglePanel(panel), "ff-assets-panel__toggle");
  toggleButton.dataset.ffAssetsToggle = "true";
  panel.append(toggleButton);

  const content = document.createElement("div");
  content.className = "ff-assets-panel__content";
  panel.append(content);

  const heading = document.createElement("div");
  heading.className = "ff-assets-panel__heading";
  heading.textContent = "资产内容";
  content.append(heading);

  if (props.state === "bound") {
    renderNasActions(content, props.nasMaterialUrls, props.onOpenNas, props.onOpenNasFeedback);

    const list = document.createElement("div");
    list.className = "ff-assets-panel__list";
    content.append(list);

    for (const item of normalizeItems(props)) {
      list.append(renderSpuCard(item, props));
    }
  } else if (props.state === "unbound") {
    renderNasActions(content, [], null, props.onOpenNasFeedback);
    content.append(renderStatusCard("暂无数据", "暂未关联数据源"));
  } else if (props.state === "loading") {
    renderStatusAction(content, "正在加载");
    content.append(renderStatusCard("加载中", "正在获取素材信息"));
  } else {
    renderStatusAction(content, "内部素材加载失败");
    content.append(renderStatusCard("内部素材加载失败", "请联系管理员", props.onContactAdmin));
  }

  document.body.append(panel);
  syncToggleLabel(panel);
  return panel;
}

export function showPanelMessage(message) {
  const panel = document.querySelector("[data-ff-assets-panel]");
  if (!panel) return;

  let messageEl = panel.querySelector("[data-ff-assets-message]");
  if (!messageEl) {
    messageEl = document.createElement("div");
    messageEl.dataset.ffAssetsMessage = "true";
    messageEl.className = "ff-assets-panel__toast";
    panel.append(messageEl);
  }

  messageEl.textContent = message;
}

function renderNasActions(content, values, onOpenNas, onOpenNasFeedback) {
  const actions = document.createElement("div");
  actions.className = "ff-assets-panel__top-actions";

  const assetLinks = parseNasAssetLinks(normalizeNasValues(values));
  if (assetLinks.length === 0) {
    actions.append(
      createButton("暂未关联NAS，去反馈", onOpenNasFeedback || null, "ff-assets-panel__button--feedback ff-assets-panel__button--wide")
    );
  } else {
    assetLinks.forEach((asset) => {
      actions.append(
        createButton(
          asset.label,
          onOpenNas ? () => onOpenNas(asset) : null,
          `ff-assets-panel__button--${asset.type} ff-assets-panel__button--wide`,
          {
            iconSvg: asset.type === "video" ? VIDEO_ICON_SVG : IMAGE_ICON_SVG
          }
        )
      );
    });
  }

  content.append(actions);
}

function renderStatusAction(content, label) {
  const actions = document.createElement("div");
  actions.className = "ff-assets-panel__top-actions";
  actions.append(createButton(label, null, "ff-assets-panel__button--feedback ff-assets-panel__button--wide"));
  content.append(actions);
}

function renderSpuCard(item, props) {
  const { spuCode, spuLabel } = splitSpuName(item.spuName);
  const card = document.createElement("div");
  card.className = "ff-assets-panel__spu-card";

  const row = document.createElement("div");
  row.className = "ff-assets-panel__spu-row";
  card.append(row);

  const title =
    props.onCopySpu && spuCode
      ? createButton(spuCode, () => props.onCopySpu(spuCode), "ff-assets-panel__title-button")
      : document.createElement("div");
  title.classList.add("ff-assets-panel__title");
  title.textContent = spuCode || item.productName || item.assetGroupName || "已关联";
  if (props.onCopySpu && spuCode) {
    title.dataset.ffAssetsSpuCopy = "true";
    title.title = "复制 SPU";
  }
  row.append(title);

  row.append(createButton("查看SPU", item.skuSheetUrl ? () => props.onOpenSku?.(item) : null, "ff-assets-panel__button--secondary ff-assets-panel__button--spu"));

  const subtitle = document.createElement("div");
  subtitle.className = "ff-assets-panel__subtitle";
  subtitle.textContent = spuLabel || item.assetGroupName || item.productName || "";
  card.append(subtitle);

  return card;
}

function renderStatusCard(titleText, subtitleText, onClick) {
  const card = document.createElement("div");
  card.className = "ff-assets-panel__spu-card ff-assets-panel__spu-card--status";
  if (onClick) {
    card.tabIndex = 0;
    card.role = "button";
    card.addEventListener("click", onClick);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick();
      }
    });
  }

  const title = document.createElement("div");
  title.className = "ff-assets-panel__title";
  title.textContent = titleText;
  card.append(title);

  const subtitle = document.createElement("div");
  subtitle.className = "ff-assets-panel__subtitle";
  subtitle.textContent = subtitleText;
  card.append(subtitle);

  return card;
}

function normalizeItems(props) {
  if (Array.isArray(props.items) && props.items.length > 0) return props.items;
  return [props];
}

function normalizeNasValues(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function createButton(label, onClick, modifierClass = "", options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ["ff-assets-panel__button", modifierClass].filter(Boolean).join(" ");
  button.disabled = !onClick;

  if (options.iconSvg) {
    const icon = document.createElement("span");
    icon.className = "ff-assets-panel__button-icon";
    icon.innerHTML = options.iconSvg;
    button.append(icon);
  }

  const labelNode = document.createElement("span");
  labelNode.className = "ff-assets-panel__button-label";
  labelNode.textContent = label;
  button.append(labelNode);

  if (onClick) {
    button.addEventListener("click", onClick);
  }

  return button;
}

function removeExistingPanel() {
  document.querySelector("[data-ff-assets-panel]")?.remove();
}

function togglePanel(panel) {
  panel.classList.toggle("ff-assets-panel--collapsed");
  if (panel.classList.contains("ff-assets-panel--collapsed")) {
    removePanelMessage(panel);
  }
  saveCollapsedState(panel.classList.contains("ff-assets-panel--collapsed"));
  syncToggleLabel(panel);
}

function removePanelMessage(panel) {
  panel.querySelector("[data-ff-assets-message]")?.remove();
}

function syncToggleLabel(panel) {
  const toggleButton = panel.querySelector("[data-ff-assets-toggle]");
  if (!toggleButton) return;
  toggleButton.textContent = panel.classList.contains("ff-assets-panel--collapsed") ? "‹ 资产内容" : "›";
}

function loadCollapsedState() {
  try {
    return localStorage.getItem("ffAssetsPanelCollapsed") === "true";
  } catch {
    return false;
  }
}

function saveCollapsedState(isCollapsed) {
  try {
    localStorage.setItem("ffAssetsPanelCollapsed", String(isCollapsed));
  } catch {
    // Ignore storage failures on restricted pages.
  }
}

function splitSpuName(value) {
  const parts = String(value || "")
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    spuCode: parts[0] || "",
    spuLabel: parts.slice(1).join(" · ")
  };
}
