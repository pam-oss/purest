import type { APIRoute } from "astro";
import { getProducts, getBlogArticles } from "@/lib/shopify";

export const prerender = true;

const staticPaths = [
  "/",
  "/products",
  "/real-ingredients",
  "/why-french-gray-sea-salt",
  "/about",
  "/science",
  "/science/electrolyte-in-a-glass-jar",
  "/science/why-water-doesnt-hydrate-you",
  "/science/sea-salt-heavy-metal-test-results",
  "/faq",
  "/contact",
  "/returns",
  "/news",
  "/affiliate",
];

export const GET: APIRoute = async () => {
  const [products, articles] = await Promise.all([getProducts(), getBlogArticles("science")]);
  const paths = [...new Set([
    ...staticPaths,
    ...products.map((product) => `/products/${product.handle}`),
    ...articles.map((article) => `/science/${article.handle}`),
  ])];

  const urls = paths.map((path) => {
    const loc = new URL(path, "https://www.purestelectrolyte.com").toString();
    const lastmod = ["/science/sea-salt-heavy-metal-test-results", "/faq", "/science"].includes(path) ? "<lastmod>2026-11-08</lastmod>" : "";
    return `  <url><loc>${loc}</loc>${lastmod}</url>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
