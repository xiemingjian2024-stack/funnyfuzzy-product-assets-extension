# Chrome Web Store Release

## Current package

- ZIP: `release/FFweb2NAS-1.1.1.zip`
- Shared install folder: `release/FFweb2NAS-1.1.1`
- Source folder: `FFweb2NAS`
- Version: `1.1.1`

## Suggested listing

- Name: `FunnyFuzzy 内部素材入口`
- Short description:
  `在 FunnyFuzzy 产品详情页快速打开 NAS 素材，并查看对应 SPU 数据。`
- Detailed description:
  `FunnyFuzzy 内部素材入口是 FunnyFuzzy 团队内部使用的浏览器扩展。安装后，在 FunnyFuzzy 官网产品详情页会显示资产面板，支持快速打开 NAS 素材目录、查看对应 SPU 数据、复制 SPU 编号，并在同一产品页展示多个关联 SPU。`

## Suggested visibility

- Preferred: `Unlisted`
- Reason:
  `适合团队内部通过链接安装，不会在商店搜索结果中公开出现。`

## Draft privacy disclosure

- Data usage summary:
  `插件仅在 FunnyFuzzy 指定产品页运行。`
  `插件会读取当前产品页 URL，用于向内部查询服务请求对应的素材与 SPU 数据。`
  `插件不会采集账号密码、支付信息或对外共享个人数据。`

- Permissions explanation:
  `storage`: 保存团队内部使用的服务地址、访问令牌、表格链接与允许域名。
  `clipboardWrite`: 支持复制 SPU 编号、NAS 路径与错误排查信息。
  `host_permissions`: 仅访问 FunnyFuzzy 指定官网域名与内部查询服务地址。

## Store assets to prepare

- 128 x 128 icon: already included
- Store icon: can reuse the same square icon
- At least 1 screenshot:
  show the panel on a FunnyFuzzy product page
- Optional promo images:
  not required for unlisted release

## Submission steps

1. Register Chrome Web Store developer account.
2. Open Chrome Web Store Developer Dashboard.
3. Create a new item.
4. Upload `release/FFweb2NAS-1.1.0.zip`.
5. Fill in name, descriptions, screenshots, and privacy answers.
6. Choose `Unlisted` visibility.
7. Submit for review.

## Notes before publish

- The current build contains default internal settings in `src/config.js`.
- If the service address or token changes later, publish a new version.
- If you want teammates to install without opening options, keep default settings accurate before each release.

## Team install note

- For teammates using unpacked install, use the versioned folder under `release/`, not the source folder.
- Example: `release/FFweb2NAS-1.1.1`
