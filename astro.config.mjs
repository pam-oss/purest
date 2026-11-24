// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";

// `output: "static"` with vercel adapter — static pages + server API routes via prerender=false.
export default defineConfig({
  output: "static",
  redirects: {
    "/products/20-servings-ginger-lime": "/products/10-count-ginger-limeaid",
    "/products/20-servings-hibiscus-lime": "/products/10-count-hibiscus-lime",
    "/products/20-servings-chocolate-cordyceps": "/products/10-count-chocolate-cordyceps-1",
    "/products/20-servings-passion-cherry": "/products/10-serving-passion-cherry",
    "/products/20-servings-cranberry": "/products/10-servings-cranberry",
  },
  adapter: vercel(),
  integrations: [
    react(),
    // applyBaseStyles:false means we control Tailwind imports in src/styles/global.css.
    // This is required for shadcn/ui's CSS variables to load correctly.
    tailwind({ applyBaseStyles: false }),
  ],
});
