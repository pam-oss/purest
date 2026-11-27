import flavorCopy from "@/data/flavor-copy.json";
import { catalogSegments, flavorNameFromCatalogTitle } from "@/lib/product-title";

export interface FlavorCopy {
  tagline?: string;
  story?: string;
  bestFor?: string[];
  howToUse?: string;
  flavorNote?: string;
  badge?: string;
}

const copyByHandle = flavorCopy as Record<string, FlavorCopy>;

// 20 serving jars are their own Shopify products. Editorial flavor copy is
// stored under the 10 serving handle for the same flavor.
const flavorCopyAliases: Record<string, string> = {
  "20-servings-ginger-lime": "10-count-ginger-limeaid",
  "20-servings-hibiscus-lime": "10-count-hibiscus-lime",
  "20-servings-chocolate-cordyceps": "10-count-chocolate-cordyceps-1",
  "20-servings-passion-cherry": "10-serving-passion-cherry",
  "20-servings-cranberry": "10-servings-cranberry",
  // The 5 Day Kit is sold under this handle. Its copy lives on the older variety pack handle.
  "5-day-hydration-kit": "20-count-variety-pack",
};

const flavorSlugToHandle: Record<string, string> = {
  "ginger-lime": "10-count-ginger-limeaid",
  "ginger-limeaid": "10-count-ginger-limeaid",
  "hibiscus-lime": "10-count-hibiscus-lime",
  "chocolate-cordyceps": "10-count-chocolate-cordyceps-1",
  "passion-cherry": "10-serving-passion-cherry",
  "cranberry": "10-servings-cranberry",
  "cranberry-mint": "10-servings-cranberry",
};

function flavorSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Size can lead the handle (`20-servings-ginger-lime`) or follow the flavor (`ginger-lime-20-servings`). */
function flavorSlugFromHandle(handle: string): string | null {
  const leading = handle.match(/^\d+-servings?-(.+)$/i);
  if (leading) return leading[1].toLowerCase();
  const trailing = handle.match(/^(.+)-\d+-servings?$/i);
  if (trailing) return trailing[1].toLowerCase();
  return null;
}

/**
 * Flavor name from an old title ("10 Servings Ginger Lime", "Ginger Lime 10 Servings")
 * or the piped title ("PUREST Real Fruit, Real Salt Electrolytes | Ginger Lime | 20 Servings").
 */
export function flavorNameFromTitle(title: string): string | null {
  const named = flavorNameFromCatalogTitle(title);
  if (named) return named;
  // A piped title that is not a known flavor (a kit) should not be parsed as one.
  if (catalogSegments(title)) return null;
  const trimmed = title.trim();
  const leading = trimmed.match(/^\d+\s+servings?\s+(.+)$/i);
  if (leading) return leading[1].replace(/\s+/g, " ").trim();
  const trailing = trimmed.match(/^(.+?)\s+\d+\s+servings?$/i);
  if (trailing) return trailing[1].replace(/\s+/g, " ").trim();
  return null;
}

export function flavorCopyKey(handle: string, title?: string): string {
  if (copyByHandle[handle]) return handle;
  const alias = flavorCopyAliases[handle];
  if (alias) return alias;

  const fromHandle = flavorSlugFromHandle(handle);
  if (fromHandle && flavorSlugToHandle[fromHandle]) return flavorSlugToHandle[fromHandle];

  if (title) {
    const name = flavorNameFromTitle(title);
    const fromTitle = name ? flavorSlugToHandle[flavorSlug(name)] : undefined;
    if (fromTitle) return fromTitle;
  }

  return handle;
}

export function flavorCopyFor(handle: string, title?: string): FlavorCopy | undefined {
  return copyByHandle[flavorCopyKey(handle, title)];
}
