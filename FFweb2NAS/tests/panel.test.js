// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderAssetsPanel, showPanelMessage } from "../src/panel.js";

describe("renderAssetsPanel", () => {
  beforeEach(() => {
    document.body.innerHTML = "<main><h1>Product title</h1></main>";
  });

  it("renders bound asset buttons", () => {
    const onCopySpu = vi.fn();
    const onOpenNas = vi.fn();

    renderAssetsPanel({
      state: "bound",
      assetGroupName: "Urban Voyager",
      spuName: "FF00001 · 树叶垫",
      nasMaterialUrl: "smb://192.168.2.4/materials",
      nasMaterialUrls: ["smb://192.168.2.4/materials"],
      skuSheetUrl: "https://feishu.cn/sku",
      bindingSheetUrl: "https://feishu.cn/bindings",
      onCopySpu,
      onOpenNas,
      onOpenSku: vi.fn(),
      onOpenBinding: vi.fn()
    });

    expect(document.querySelector("[data-ff-assets-panel]")).toBeTruthy();
    expect(document.body.textContent).toContain("FF00001");
    expect(document.body.textContent).toContain("树叶垫");
    expect(document.body.textContent).toContain("图片素材");
    expect(document.body.textContent).toContain("查看SPU");
    expect(document.body.textContent).not.toContain("数据源管理");

    document.querySelector("[data-ff-assets-spu-copy]").click();
    expect(onCopySpu).toHaveBeenCalledWith("FF00001");
  });

  it("renders image and video asset buttons and opens the selected one", () => {
    const onOpenNas = vi.fn();

    renderAssetsPanel({
      state: "bound",
      nasMaterialUrls: ["'/Volumes/图片1'", "'/Volumes/图片2'", "video:'/Volumes/视频1'"],
      items: [
        {
          spuName: "FF00001 · 树叶垫",
          assetGroupName: "Leaf",
          skuSheetUrl: "https://feishu.cn/sku?record=1"
        }
      ],
      bindingSheetUrl: "https://feishu.cn/bindings",
      onOpenNas,
      onOpenSku: vi.fn(),
      onOpenBinding: vi.fn()
    });

    const buttons = [...document.querySelectorAll(".ff-assets-panel__top-actions .ff-assets-panel__button")];
    expect(buttons.map((button) => button.textContent.replace(/\s+/g, ""))).toEqual(["图片素材", "图片素材", "视频素材"]);
    expect(buttons[0].className).toContain("ff-assets-panel__button--image");
    expect(buttons[2].className).toContain("ff-assets-panel__button--video");

    buttons[1].click();
    expect(onOpenNas).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "image",
        path: "'/Volumes/图片2'"
      })
    );
  });

  it("shows feedback button when NAS material is not linked", () => {
    const onOpenNasFeedback = vi.fn();

    renderAssetsPanel({
      state: "bound",
      assetGroupName: "Urban Voyager",
      spuName: "FF00001 · 树叶垫",
      nasMaterialUrl: "",
      skuSheetUrl: "https://feishu.cn/sku",
      onOpenNas: vi.fn(),
      onOpenNasFeedback,
      onOpenSku: vi.fn(),
    });

    const buttons = [...document.querySelectorAll(".ff-assets-panel__button")];
    const nasButton = buttons.find((button) => button.textContent === "暂未关联NAS，去反馈");

    expect(document.body.textContent).toContain("FF00001");
    expect(document.body.textContent).toContain("树叶垫");
    expect(document.body.textContent).toContain("查看SPU");
    expect(nasButton).toBeTruthy();
    nasButton.click();
    expect(onOpenNasFeedback).toHaveBeenCalledTimes(1);
  });

  it("renders unbound state", () => {
    const onOpenNasFeedback = vi.fn();

    renderAssetsPanel({
      state: "unbound",
      onOpenNasFeedback
    });

    expect(document.body.textContent).toContain("暂无数据");
    expect(document.body.textContent).toContain("暂未关联数据源");
    expect(document.body.textContent).toContain("暂未关联NAS，去反馈");
  });

  it("renders data fetch failure state inside the compact card", () => {
    const onContactAdmin = vi.fn();

    renderAssetsPanel({
      state: "error",
      message: "内部素材加载失败：获取失败",
      onContactAdmin
    });

    expect(document.body.textContent).toContain("内部素材加载失败");
    expect(document.body.textContent).toContain("请联系管理员");
    expect(document.body.textContent).not.toContain("数据源管理");

    document.querySelector(".ff-assets-panel__spu-card--status").click();
    expect(onContactAdmin).toHaveBeenCalledTimes(1);
  });

  it("renders loading state immediately", () => {
    renderAssetsPanel({
      state: "loading",
    });

    expect(document.body.textContent).toContain("加载中");
    expect(document.body.textContent).toContain("正在获取素材信息");
    expect(document.body.textContent).not.toContain("数据源管理");
  });

  it("can collapse and expand from the side", () => {
    renderAssetsPanel({
      state: "bound",
      assetGroupName: "Urban Voyager",
      spuName: "FF00001 · 树叶垫",
      nasMaterialUrl: "smb://192.168.2.4/materials",
      skuSheetUrl: "https://feishu.cn/sku",
      bindingSheetUrl: "https://feishu.cn/bindings",
      onOpenNas: vi.fn(),
      onOpenSku: vi.fn(),
      onOpenBinding: vi.fn()
    });

    const panel = document.querySelector("[data-ff-assets-panel]");
    const toggle = document.querySelector("[data-ff-assets-toggle]");
    toggle.click();

    expect(panel.classList.contains("ff-assets-panel--collapsed")).toBe(true);
    expect(toggle.textContent).toBe("‹ 资产内容");

    toggle.click();
    expect(panel.classList.contains("ff-assets-panel--collapsed")).toBe(false);
    expect(toggle.textContent).toBe("›");
  });

  it("clears temporary messages when collapsed", () => {
    renderAssetsPanel({
      state: "bound",
      assetGroupName: "Urban Voyager",
      spuName: "FF00001 · 树叶垫",
      nasMaterialUrl: "smb://192.168.2.4/materials",
      skuSheetUrl: "https://feishu.cn/sku",
      bindingSheetUrl: "https://feishu.cn/bindings",
      onOpenNas: vi.fn(),
      onOpenSku: vi.fn(),
      onOpenBinding: vi.fn()
    });

    showPanelMessage("正在尝试打开 NAS 素材");
    expect(document.querySelector("[data-ff-assets-message]")).toBeTruthy();

    document.querySelector("[data-ff-assets-toggle]").click();

    expect(document.querySelector("[data-ff-assets-message]")).toBeNull();
  });

  it("renders multiple SPU cards", () => {
    const onOpenSku = vi.fn();

    renderAssetsPanel({
      state: "bound",
      nasMaterialUrl: "smb://192.168.2.4/materials",
      bindingSheetUrl: "https://feishu.cn/bindings",
      items: [
        {
          spuName: "FF00003 · 树叶垫",
          assetGroupName: "Leaf",
          skuSheetUrl: "https://feishu.cn/sku?record=1"
        },
        {
          spuName: "FF00115 · 纯色雪尼尔防刮人字纹沙发套",
          assetGroupName: "Sofa",
          skuSheetUrl: "https://feishu.cn/sku?record=2"
        }
      ],
      onOpenNas: vi.fn(),
      onOpenSku,
      onOpenBinding: vi.fn()
    });

    expect(document.querySelectorAll(".ff-assets-panel__spu-card")).toHaveLength(2);
    expect(document.body.textContent).toContain("FF00003");
    expect(document.body.textContent).toContain("FF00115");

    document.querySelectorAll(".ff-assets-panel__button--spu")[1].click();
    expect(onOpenSku).toHaveBeenCalledWith(
      expect.objectContaining({
        spuName: "FF00115 · 纯色雪尼尔防刮人字纹沙发套"
      })
    );
  });
});
