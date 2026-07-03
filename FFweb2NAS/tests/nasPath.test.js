import { describe, expect, it } from "vitest";
import { formatNasNavigationTarget, formatNasPathForPlatform, normalizeNasPath } from "../src/nasPath.js";

describe("normalizeNasPath", () => {
  it("removes smb and windows prefixes into a neutral slash path", () => {
    expect(normalizeNasPath("smb://192.168.2.4/公司项目/FUNNYFUZZY")).toBe("192.168.2.4/公司项目/FUNNYFUZZY");
    expect(normalizeNasPath("\\\\192.168.2.4\\公司项目\\FUNNYFUZZY")).toBe("192.168.2.4/公司项目/FUNNYFUZZY");
    expect(normalizeNasPath("192.168.2.4/公司项目/FUNNYFUZZY")).toBe("192.168.2.4/公司项目/FUNNYFUZZY");
    expect(normalizeNasPath("'/Volumes/公司项目/FUNNYFUZZY/设计部/产品'")).toBe("192.168.2.4/公司项目/FUNNYFUZZY/设计部/产品");
    expect(normalizeNasPath("'/System/Volumes/Data/Volumes/公司项目/FUNNYFUZZY/设计部/产品'")).toBe(
      "192.168.2.4/公司项目/FUNNYFUZZY/设计部/产品"
    );
    expect(normalizeNasPath("nas_material_url = /Volumes/公司项目/FUNNYFUZZY/设计部/产品")).toBe(
      "192.168.2.4/公司项目/FUNNYFUZZY/设计部/产品"
    );
    expect(
      normalizeNasPath("//[192.168.2.4/](http://192.168.2.4/)公司项目/FUNNYFUZZY/设计部/产品/Deluxe Faux Leather Dog Car Seat Booster Bed - Urban Voyager")
    ).toBe("192.168.2.4/公司项目/FUNNYFUZZY/设计部/产品/Deluxe Faux Leather Dog Car Seat Booster Bed - Urban Voyager");
    expect(
      normalizeNasPath("'[192.168.2.4/](http://192.168.2.4/)公司项目/FUNNYFUZZY/设计部/产品/Deluxe Faux Leather Dog Car Seat Booster Bed - Urban Voyager'")
    ).toBe("192.168.2.4/公司项目/FUNNYFUZZY/设计部/产品/Deluxe Faux Leather Dog Car Seat Booster Bed - Urban Voyager");
  });
});

describe("formatNasPathForPlatform", () => {
  it("formats a neutral NAS path for macOS", () => {
    expect(formatNasPathForPlatform("192.168.2.4/公司项目/FUNNYFUZZY", "MacIntel")).toBe(
      "smb://192.168.2.4/公司项目/FUNNYFUZZY"
    );
  });

  it("formats a neutral NAS path for Windows", () => {
    expect(formatNasPathForPlatform("192.168.2.4/公司项目/FUNNYFUZZY", "Win32")).toBe(
      "\\\\192.168.2.4\\公司项目\\FUNNYFUZZY"
    );
  });
});

describe("formatNasNavigationTarget", () => {
  it("encodes smb targets for macOS browser navigation", () => {
    expect(
      formatNasNavigationTarget(
        "192.168.2.4/公司项目/FUNNYFUZZY/设计部/产品/Deluxe Faux Leather Dog Car Seat Booster Bed - Urban Voyager/爱马仕2.0耳仔织带设计导出",
        "MacIntel"
      )
    ).toBe(
      "smb://192.168.2.4/%E5%85%AC%E5%8F%B8%E9%A1%B9%E7%9B%AE/FUNNYFUZZY/%E8%AE%BE%E8%AE%A1%E9%83%A8/%E4%BA%A7%E5%93%81/Deluxe%20Faux%20Leather%20Dog%20Car%20Seat%20Booster%20Bed%20-%20Urban%20Voyager/%E7%88%B1%E9%A9%AC%E4%BB%952.0%E8%80%B3%E4%BB%94%E7%BB%87%E5%B8%A6%E8%AE%BE%E8%AE%A1%E5%AF%BC%E5%87%BA"
    );
  });

  it("keeps windows UNC targets unchanged for browser navigation", () => {
    expect(formatNasNavigationTarget("192.168.2.4/公司项目/FUNNYFUZZY", "Win32")).toBe(
      "\\\\192.168.2.4\\公司项目\\FUNNYFUZZY"
    );
  });
});
