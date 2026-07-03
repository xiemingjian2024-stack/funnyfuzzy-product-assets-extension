export function detectProductPage({ href, hostname, document }) {
  const url = new URL(href);
  const match = url.pathname.match(/^\/products\/([^/?#]+)/);

  if (!match) {
    return { isProductPage: false };
  }

  const productSlug = decodeURIComponent(match[1]);
  const titleElement =
    document.querySelector("h1") ||
    document.querySelector("[data-product-title]") ||
    document.querySelector(".product__title");

  return {
    isProductPage: true,
    productSlug,
    productTitle: normalizeText(titleElement?.textContent || document.title || ""),
    siteDomain: hostname,
    pageUrl: url.href
  };
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}
