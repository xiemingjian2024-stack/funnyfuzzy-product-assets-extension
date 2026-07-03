import { describe, expect, it, vi } from "vitest";
import { createFeishuClient } from "../src/feishuClient.js";

describe("createFeishuClient", () => {
  it("loads all Feishu table pages", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          tenant_access_token: "tenant-token",
          expire: 7200
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            has_more: true,
            page_token: "next-page",
            items: [{ record_id: "rec-1", fields: { SPU: "FF00001" } }]
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            has_more: false,
            items: [{ record_id: "rec-501", fields: { SPU: "FF00501" } }]
          }
        })
      });

    const client = createFeishuClient(
      {
        feishuAppId: "app-id",
        feishuAppSecret: "app-secret",
        feishuBaseAppToken: "base-token",
        feishuBindingsTableId: "table-id"
      },
      fetchImpl
    );

    await expect(client.listBindings()).resolves.toEqual([
      { SPU: "FF00001", __recordId: "rec-1" },
      { SPU: "FF00501", __recordId: "rec-501" }
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[2][0].searchParams.get("page_token")).toBe("next-page");
  });

  it("searches bindings by product URL slug", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          tenant_access_token: "tenant-token",
          expire: 7200
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            items: [
              {
                record_id: "rec-stairs",
                fields: {
                  SPU: "FF02507",
                  product_url: "https://funnyfuzzy.com/products/travel-portable-foldable-4-steps-non-slip-dog-car-stairs"
                }
              }
            ]
          }
        })
      });

    const client = createFeishuClient(
      {
        feishuAppId: "app-id",
        feishuAppSecret: "app-secret",
        feishuBaseAppToken: "base-token",
        feishuBindingsTableId: "table-id"
      },
      fetchImpl
    );

    await expect(
      client.searchBindings({
        productSlug: "travel-portable-foldable-4-steps-non-slip-dog-car-stairs",
        pageUrl: "https://funnyfuzzy.com/products/travel-portable-foldable-4-steps-non-slip-dog-car-stairs"
      })
    ).resolves.toEqual([
      {
        SPU: "FF02507",
        product_url: "https://funnyfuzzy.com/products/travel-portable-foldable-4-steps-non-slip-dog-car-stairs",
        __recordId: "rec-stairs"
      }
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[1][0])).toContain("/records/search");
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({
      filter: {
        conjunction: "and",
        conditions: [{ field_name: "product_url", operator: "contains", value: ["travel-portable-foldable-4-steps-non-slip-dog-car-stairs"] }]
      }
    });
  });
});
