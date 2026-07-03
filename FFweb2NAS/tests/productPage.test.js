// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { detectProductPage } from "../src/productPage.js";

describe("detectProductPage", () => {
  it("extracts product identity from a FunnyFuzzy product URL", () => {
    const document = new DOMParser().parseFromString(
      "<main><h1>Deluxe Faux Leather Dog Car Seat Booster Bed - Urban Voyager</h1></main>",
      "text/html"
    );

    const result = detectProductPage({
      href: "https://funnyfuzzy.com/products/deluxe-faux-leather-dog-car-seat-booster-bed-urban-voyager",
      hostname: "funnyfuzzy.com",
      document
    });

    expect(result).toEqual({
      isProductPage: true,
      productSlug: "deluxe-faux-leather-dog-car-seat-booster-bed-urban-voyager",
      productTitle: "Deluxe Faux Leather Dog Car Seat Booster Bed - Urban Voyager",
      siteDomain: "funnyfuzzy.com",
      pageUrl: "https://funnyfuzzy.com/products/deluxe-faux-leather-dog-car-seat-booster-bed-urban-voyager"
    });
  });

  it("returns a non-product result outside /products/", () => {
    const document = new DOMParser().parseFromString("<main><h1>Home</h1></main>", "text/html");

    const result = detectProductPage({
      href: "https://funnyfuzzy.com/collections/dog-car-seat",
      hostname: "funnyfuzzy.com",
      document
    });

    expect(result).toEqual({ isProductPage: false });
  });
});
