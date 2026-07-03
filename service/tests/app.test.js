import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";

describe("GET /api/assets/lookup", () => {
  it("rejects requests without the extension token", async () => {
    const app = createApp({
      config: { extensionAccessToken: "secret" },
      feishuClient: {
        listBindings: vi.fn()
      }
    });

    const response = await request(app).get("/api/assets/lookup?product_slug=test&site_domain=funnyfuzzy.co.uk");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorized" });
  });

  it("returns a bound asset response", async () => {
    const app = createApp({
      config: { extensionAccessToken: "secret" },
      feishuClient: {
        listBindings: vi.fn().mockResolvedValue([
          {
            product_slug: "urban-voyager",
            product_name: "Urban Voyager",
            product_url: "https://funnyfuzzy.co.uk/products/urban-voyager",
            nas_material_url: "smb://192.168.2.4/materials",
            sku_sheet_url: "https://feishu.cn/sku",
            binding_sheet_url: "https://feishu.cn/bindings"
          }
        ])
      }
    });

    const response = await request(app)
      .get("/api/assets/lookup?product_slug=urban-voyager&site_domain=funnyfuzzy.co.uk")
      .set("Authorization", "Bearer secret");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      state: "bound",
      productName: "Urban Voyager",
      assetGroupName: "Urban Voyager",
      nasMaterialUrl: "smb://192.168.2.4/materials",
      skuSheetUrl: "https://feishu.cn/sku",
      bindingSheetUrl: "https://feishu.cn/bindings"
    });
    expect(response.body.items).toHaveLength(1);
  });

  it("uses targeted Feishu search when available", async () => {
    const searchBindings = vi.fn().mockResolvedValue([
      {
        product_url: "https://funnyfuzzy.com/products/travel-portable-foldable-4-steps-non-slip-dog-car-stairs",
        SPU: "FF02507",
        "中文SPU": "便捷可折叠四步狗狗车用楼梯",
        nas_material_url: "/Volumes/公司项目/FUNNYFUZZY/设计部/产品/Travel Portable Foldable 4-Steps Non-Slip Dog Car Stairs"
      }
    ]);
    const listBindings = vi.fn();
    const app = createApp({
      config: {
        extensionAccessToken: "secret",
        bindingSheetUrl: "https://feishu.cn/base/table"
      },
      feishuClient: {
        searchBindings,
        listBindings
      }
    });

    const response = await request(app)
      .get(
        "/api/assets/lookup?product_slug=travel-portable-foldable-4-steps-non-slip-dog-car-stairs&site_domain=funnyfuzzy.com&page_url=https%3A%2F%2Ffunnyfuzzy.com%2Fproducts%2Ftravel-portable-foldable-4-steps-non-slip-dog-car-stairs"
      )
      .set("Authorization", "Bearer secret");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      state: "bound",
      productName: "FF02507",
      spuName: "FF02507 · 便捷可折叠四步狗狗车用楼梯"
    });
    expect(searchBindings).toHaveBeenCalledWith({
      productSlug: "travel-portable-foldable-4-steps-non-slip-dog-car-stairs",
      pageUrl: "https://funnyfuzzy.com/products/travel-portable-foldable-4-steps-non-slip-dog-car-stairs"
    });
    expect(listBindings).not.toHaveBeenCalled();
  });

  it("allows private network preflight requests", async () => {
    const app = createApp({
      config: { extensionAccessToken: "secret" },
      feishuClient: {
        listBindings: vi.fn()
      }
    });

    const response = await request(app)
      .options("/api/assets/lookup")
      .set("Origin", "chrome-extension://test")
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Private-Network", "true");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-private-network"]).toBe("true");
  });
});
