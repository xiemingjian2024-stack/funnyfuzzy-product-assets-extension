# FunnyFuzzy Product Assets Extension

A Chrome extension and lightweight local service for linking product detail pages with internal asset folders and SPU records.

## What it does

- Adds a floating asset panel to FunnyFuzzy product pages
- Opens NAS material folders directly from the product page
- Supports multiple asset links for one product
- Distinguishes image assets and video assets with separate buttons
- Opens the related SPU sheet for merchandising and design teams
- Falls back to a feedback entry when no NAS path is linked yet

## Project structure

- `FFweb2NAS/`: browser extension
- `service/`: local/internal query service
- `scripts/`: build, package, and data-cleaning helpers
- `docs/`: setup notes and maintenance rules

## Asset link rules

The extension reads NAS links from a single `nas_material_url` field.

- Plain path: treated as an image asset
- `video:` prefix: treated as a video asset

Examples:

```text
'/Volumes/company/project/product/image-folder'
video:'/Volumes/company/project/product/video-folder'
'/Volumes/.../image-folder-1','/Volumes/.../image-folder-2',video:'/Volumes/.../video-folder-1'
```

## Local development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build the extension:

```bash
npm run build:extension
```

Package a release build:

```bash
npm run package:extension
```

Start the local service:

```bash
npm run service:start
```

## Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the `FFweb2NAS` folder

## Notes

- Environment variables are stored locally in `.env` and are not committed
- Release packages are generated locally and are not committed
- Internal deployment values should be configured per environment
