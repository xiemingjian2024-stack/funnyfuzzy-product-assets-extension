import { describe, expect, it } from "vitest";
import { buildFieldValue, buildRecordsUrl, normalizeSingleNas } from "./normalize-nas-paths-lib.mjs";

describe("buildRecordsUrl", () => {
  it("includes view_id when provided", () => {
    const url = buildRecordsUrl({
      baseAppToken: "appToken",
      tableId: "tableId",
      viewId: "vewAp9beVa"
    });

    expect(url.toString()).toContain("/apps/appToken/tables/tableId/records?");
    expect(url.searchParams.get("page_size")).toBe("500");
    expect(url.searchParams.get("view_id")).toBe("vewAp9beVa");
  });

  it("omits view_id when not provided", () => {
    const url = buildRecordsUrl({
      baseAppToken: "appToken",
      tableId: "tableId"
    });

    expect(url.searchParams.get("view_id")).toBeNull();
  });
});

describe("normalizeSingleNas", () => {
  it("converts double-slash IP paths into the standard Volumes format", () => {
    expect(
      normalizeSingleNas("//192.168.2.4/公司项目/FUNNYFUZZY/设计部/产品/Waterproof Dog Car Seat Bed - First Class")
    ).toBe("'/Volumes/公司项目/FUNNYFUZZY/设计部/产品/Waterproof Dog Car Seat Bed - First Class'");
  });
});

describe("buildFieldValue", () => {
  it("writes nas values back as plain text", () => {
    expect(buildFieldValue("'/Volumes/公司项目/FUNNYFUZZY'")).toBe("'/Volumes/公司项目/FUNNYFUZZY'");
  });
});
