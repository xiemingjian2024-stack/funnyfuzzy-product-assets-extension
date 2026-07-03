import cors from "cors";
import express from "express";
import { resolveBinding } from "./bindingResolver.js";

export function createApp({ config, feishuClient }) {
  const app = express();
  app.use(cors({ preflightContinue: true }));
  app.use((request, response, next) => {
    response.setHeader("Access-Control-Allow-Private-Network", "true");
    if (request.method === "OPTIONS") {
      response.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.get("/api/assets/lookup", async (request, response, next) => {
    try {
      if (request.get("Authorization") !== `Bearer ${config.extensionAccessToken}`) {
        response.status(401).json({ error: "Unauthorized" });
        return;
      }

      const productSlug = String(request.query.product_slug || "").trim();
      const pageUrl = String(request.query.page_url || "").trim();
      const siteDomain = String(request.query.site_domain || "").trim();
      if (!productSlug) {
        response.status(400).json({ error: "product_slug is required" });
        return;
      }

      const bindings = feishuClient.searchBindings
        ? await feishuClient.searchBindings({ productSlug, pageUrl })
        : await feishuClient.listBindings();

      response.json(
        resolveBinding({
          productSlug,
          pageUrl,
          siteDomain,
          bindings,
          bindingSheetUrl: config.bindingSheetUrl,
          skuSheetUrl: config.skuSheetUrl,
          includeRecordLink: config.includeRecordLink
        })
      );
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _request, response, _next) => {
    response.status(500).json({ error: error.message });
  });

  return app;
}
