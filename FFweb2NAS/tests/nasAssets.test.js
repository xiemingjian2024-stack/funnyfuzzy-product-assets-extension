import { describe, expect, it } from "vitest";
import { parseNasAssetLinks } from "../src/nasAssets.js";

describe("parseNasAssetLinks", () => {
  it("treats untagged nas paths as image assets", () => {
    expect(parseNasAssetLinks(["'/Volumes/产品/图片目录'"])).toEqual([
      {
        type: "image",
        path: "'/Volumes/产品/图片目录'",
        label: "图片素材"
      }
    ]);
  });

  it("recognizes video tags case-insensitively", () => {
    expect(parseNasAssetLinks(["video:'/Volumes/产品/视频目录'", "VIDEO: '/Volumes/产品/视频目录2'"])).toEqual([
      {
        type: "video",
        path: "'/Volumes/产品/视频目录'",
        label: "视频素材"
      },
      {
        type: "video",
        path: "'/Volumes/产品/视频目录2'",
        label: "视频素材"
      }
    ]);
  });

  it("keeps image assets before video assets and removes duplicates", () => {
    expect(
      parseNasAssetLinks([
        "video:'/Volumes/产品/视频目录'",
        "'/Volumes/产品/图片目录'",
        "'/Volumes/产品/图片目录'",
        "image:'/Volumes/产品/图片目录2'"
      ])
    ).toEqual([
      {
        type: "image",
        path: "'/Volumes/产品/图片目录'",
        label: "图片素材"
      },
      {
        type: "image",
        path: "'/Volumes/产品/图片目录2'",
        label: "图片素材"
      },
      {
        type: "video",
        path: "'/Volumes/产品/视频目录'",
        label: "视频素材"
      }
    ]);
  });

  it("ignores empty values after tagging", () => {
    expect(parseNasAssetLinks(["video:", "image: ", "", null])).toEqual([]);
  });
});
