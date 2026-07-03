import { describe, expect, it } from "vitest";
import { resolveBinding } from "../src/bindingResolver.js";

describe("resolveBinding", () => {
  it("returns a bound response when one active product binding matches", () => {
    const result = resolveBinding({
      productSlug: "deluxe-faux-leather-dog-car-seat-booster-bed-urban-voyager",
      pageUrl: "https://funnyfuzzy.co.uk/products/deluxe-faux-leather-dog-car-seat-booster-bed-urban-voyager?utm_source=test",
      siteDomain: "funnyfuzzy.co.uk",
      bindingSheetUrl: "https://feishu.cn/bindings",
      bindings: [
        {
          product_slug: "deluxe-faux-leather-dog-car-seat-booster-bed-urban-voyager",
          product_name: "Urban Voyager",
          product_url: "https://funnyfuzzy.co.uk/products/deluxe-faux-leather-dog-car-seat-booster-bed-urban-voyager",
          site_domain: "funnyfuzzy.co.uk",
          nas_material_url: "smb://192.168.2.4/materials",
          sku_sheet_url: "https://feishu.cn/sku",
          status: "active"
        }
      ]
    });

    expect(result).toMatchObject({
      state: "bound",
      productName: "Urban Voyager",
      assetGroupName: "Urban Voyager",
      nasMaterialUrl: "smb://192.168.2.4/materials",
      skuSheetUrl: "https://feishu.cn/sku",
      bindingSheetUrl: "https://feishu.cn/bindings"
    });
    expect(result.items).toHaveLength(1);
  });

  it("returns unbound when no active binding matches", () => {
    const result = resolveBinding({
      productSlug: "missing-product",
      bindings: []
    });

    expect(result).toEqual({ state: "unbound" });
  });

  it("returns a bound response when product URL matches but NAS material is blank", () => {
    const result = resolveBinding({
      productSlug: "travel-bolster-safety-medium-large-dog-car-back-seat-bed",
      pageUrl: "https://funnyfuzzy.com/products/travel-bolster-safety-medium-large-dog-car-back-seat-bed",
      skuSheetUrl: "https://feishu.cn/sku",
      bindings: [
        {
          __recordId: "rec-spu",
          SPU: "FF00002",
          "中文SPU": "超大沙发后座车载狗床",
          "英文标题": "Travel Bolster Safety Medium Large Dog Car Back Seat Bed",
          product_url: "https://funnyfuzzy.com/products/travel-bolster-safety-medium-large-dog-car-back-seat-bed",
          nas_material_url: ""
        }
      ]
    });

    expect(result).toMatchObject({
      state: "bound",
      spuName: "FF00002 · 超大沙发后座车载狗床",
      nasMaterialUrl: "",
      nasMaterialUrls: [],
      skuSheetUrl: "https://feishu.cn/sku?record=rec-spu"
    });
  });

  it("splits multiple nas paths from one field", () => {
    const result = resolveBinding({
      productSlug: "super-large-leaf-shape-human-mat-dog-blanket",
      pageUrl: "https://funnyfuzzy.com/products/super-large-leaf-shape-human-mat-dog-blanket",
      bindings: [
        {
          SPU: "FF00001",
          "中文SPU": "树叶垫",
          product_url: "https://funnyfuzzy.com/products/super-large-leaf-shape-human-mat-dog-blanket",
          nas_material_url:
            "'/Volumes/公司项目/FUNNYFUZZY/设计部/产品/A'，'/System/Volumes/Data/Volumes/公司项目/FUNNYFUZZY/设计部/产品/B';192.168.2.4/公司项目/FUNNYFUZZY/设计部/产品/C"
        }
      ]
    });

    expect(result).toMatchObject({
      state: "bound",
      nasMaterialUrl: "'/Volumes/公司项目/FUNNYFUZZY/设计部/产品/A'"
    });
    expect(result.nasMaterialUrls).toEqual([
      "'/Volumes/公司项目/FUNNYFUZZY/设计部/产品/A'",
      "'/System/Volumes/Data/Volumes/公司项目/FUNNYFUZZY/设计部/产品/B'",
      "192.168.2.4/公司项目/FUNNYFUZZY/设计部/产品/C"
    ]);
    expect(result.items[0].nasMaterialUrls).toEqual(result.nasMaterialUrls);
  });

  it("returns multiple items when multiple active bindings match one page", () => {
    const result = resolveBinding({
      productSlug: "same-product",
      pageUrl: "https://funnyfuzzy.com/products/same-product",
      bindings: [
        { SPU: "FF00001", product_url: "https://funnyfuzzy.com/products/same-product", product_name: "A", status: "active" },
        { SPU: "FF00002", product_url: "https://funnyfuzzy.com/products/same-product", product_name: "B", status: "active" }
      ]
    });

    expect(result.state).toBe("bound");
    expect(result.items.map((item) => item.spuName)).toEqual(["FF00001", "FF00002"]);
  });

  it("matches one URL from a comma separated product URL field", () => {
    const result = resolveBinding({
      productSlug: "travel-bolster-safety-medium-large-dog-car-back-seat-bed",
      pageUrl: "https://funnyfuzzy.com/products/travel-bolster-safety-medium-large-dog-car-back-seat-bed",
      bindings: [
        {
          __recordId: "rec-multi-url",
          SPU: "FF00001",
          "中文SPU": "树叶垫",
          product_url: [
            { link: "https://funnyfuzzy.com/products/super-large-leaf-shape-human-mat-dog-blanket", text: "leaf", type: "url" },
            { text: ",", type: "text" },
            {
              link: "https://funnyfuzzy.com/products/travel-bolster-safety-medium-large-dog-car-back-seat-bed",
              text: "travel",
              type: "url"
            }
          ],
          nas_material_url: "192.168.2.4/公司项目/FUNNYFUZZY"
        }
      ]
    });

    expect(result).toMatchObject({
      state: "bound",
      spuName: "FF00001 · 树叶垫"
    });
  });

  it("falls back to slug and domain when product URL is blank", () => {
    const result = resolveBinding({
      productSlug: "same-product",
      siteDomain: "funnyfuzzy.co.uk",
      bindings: [
        {
          product_slug: "same-product",
          site_domain: "funnyfuzzy.co.uk",
          product_name: "Shared Product",
          nas_material_url: "smb://192.168.2.4/shared"
        },
        {
          product_slug: "same-product",
          site_domain: "funnyfuzzy.com",
          product_name: "US Shared Product",
          nas_material_url: "smb://192.168.2.4/us"
        }
      ]
    });

    expect(result).toMatchObject({
      state: "bound",
      productName: "Shared Product",
      nasMaterialUrl: "smb://192.168.2.4/shared"
    });
  });

  it("uses the real URL from Feishu link fields instead of display text", () => {
    const result = resolveBinding({
      productSlug: "linked-product",
      bindings: [
        {
          product_slug: "linked-product",
          product_name: "Linked Product",
          sku_sheet_url: [{ text: "mac OS 系统 Figma 文件", link: "https://funnyfuzzy.feishu.cn/base/sku" }],
          binding_sheet_url: { text: "产品素材绑定表", link: "https://funnyfuzzy.feishu.cn/wiki/bindings" },
          status: "active"
        }
      ]
    });

    expect(result).toMatchObject({
      state: "bound",
      skuSheetUrl: "https://funnyfuzzy.feishu.cn/base/sku",
      bindingSheetUrl: "https://funnyfuzzy.feishu.cn/wiki/bindings"
    });
  });

  it("builds a SKU sheet record URL from the matched Feishu record when sku_sheet_url is blank", () => {
    const result = resolveBinding({
      productSlug: "super-large-leaf-shape-human-mat-dog-blanket",
      pageUrl: "https://funnyfuzzy.com/products/super-large-leaf-shape-human-mat-dog-blanket?_pos=1",
      bindingSheetUrl: "https://funnyfuzzy.feishu.cn/base/Zp8FbWjxfai4zSsmqNJc8aTbnRf?table=tblPi1SL1OzsArpa&view=vewrGW315v",
      bindings: [
        {
          __recordId: "recui0RVpidQMS",
          SPU: "FF00001",
          "中文SPU": "树叶垫",
          "英文标题": "Super Large Leaf Shape Human Mat Dog Blanket",
          product_url: "https://funnyfuzzy.com/products/super-large-leaf-shape-human-mat-dog-blanket",
          nas_material_url: "192.168.2.4/公司项目/FUNNYFUZZY/设计部/产品/Super Large High Quality Leaf Shape Human Mat Dog Blanket"
        }
      ]
    });

    expect(result).toMatchObject({
      state: "bound",
      productName: "Super Large Leaf Shape Human Mat Dog Blanket",
      spuName: "FF00001 · 树叶垫",
      skuSheetUrl:
        "https://funnyfuzzy.feishu.cn/base/Zp8FbWjxfai4zSsmqNJc8aTbnRf?table=tblPi1SL1OzsArpa&view=vewrGW315v&record=recui0RVpidQMS"
    });
  });

  it("opens the sheet view without a record id when record links are disabled", () => {
    const result = resolveBinding({
      productSlug: "travel-portable-foldable-4-steps-non-slip-dog-car-stairs",
      pageUrl: "https://funnyfuzzy.com/products/travel-portable-foldable-4-steps-non-slip-dog-car-stairs",
      bindingSheetUrl: "https://funnyfuzzy.feishu.cn/base/KhLGbYdBwa49ufswb1WcuyQznKe?table=tbltRiGGsqxuPKVE&view=vewrGW315v",
      skuSheetUrl: "https://funnyfuzzy.feishu.cn/base/MHdPb5gYvahkAEsfZY6cOGJunpc?table=tblIGfq0L6THMGSZ&view=vewRv9d25f",
      includeRecordLink: false,
      bindings: [
        {
          __recordId: "old-table-record-id",
          SPU: "FF02507",
          "中文SPU": "便捷可折叠四步狗狗车用楼梯",
          product_url: "https://funnyfuzzy.com/products/travel-portable-foldable-4-steps-non-slip-dog-car-stairs",
          nas_material_url: "192.168.2.4/公司项目/FUNNYFUZZY"
        }
      ]
    });

    expect(result).toMatchObject({
      state: "bound",
      spuName: "FF02507 · 便捷可折叠四步狗狗车用楼梯",
      skuSheetUrl: "https://funnyfuzzy.feishu.cn/base/MHdPb5gYvahkAEsfZY6cOGJunpc?table=tblIGfq0L6THMGSZ&view=vewRv9d25f",
      bindingSheetUrl: "https://funnyfuzzy.feishu.cn/base/KhLGbYdBwa49ufswb1WcuyQznKe?table=tbltRiGGsqxuPKVE&view=vewrGW315v"
    });
  });

  it("dedupes multiple SKU rows for the same SPU", () => {
    const result = resolveBinding({
      productSlug: "super-large-leaf-shape-human-mat-dog-blanket",
      pageUrl: "https://funnyfuzzy.com/products/super-large-leaf-shape-human-mat-dog-blanket",
      bindingSheetUrl: "https://funnyfuzzy.feishu.cn/base/test?table=tbl&view=vew",
      bindings: [
        {
          __recordId: "rec-first",
          SPU: "FF00001",
          "中文SPU": "树叶垫",
          "英文标题": "Super Large Leaf Shape Human Mat Dog Blanket",
          product_url: "https://funnyfuzzy.com/products/super-large-leaf-shape-human-mat-dog-blanket",
          nas_material_url: "192.168.2.4/公司项目/FUNNYFUZZY"
        },
        {
          __recordId: "rec-second",
          SPU: "FF00001",
          "中文SPU": "树叶垫",
          "英文标题": "Leaf Shape Dog Blanket",
          product_url: "https://funnyfuzzy.com/products/super-large-leaf-shape-human-mat-dog-blanket",
          nas_material_url: "192.168.2.4/公司项目/FUNNYFUZZY"
        }
      ]
    });

    expect(result).toMatchObject({
      state: "bound",
      productName: "Super Large Leaf Shape Human Mat Dog Blanket",
      skuSheetUrl: "https://funnyfuzzy.feishu.cn/base/test?table=tbl&view=vew&record=rec-first"
    });
    expect(result.items).toHaveLength(1);
  });
});
