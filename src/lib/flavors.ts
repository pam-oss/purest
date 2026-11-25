/**
 * Five jar flavors are separate Shopify products for the 10 and 20 serving
 * sizes. The product page groups each pair and swaps the Shopify product
 * when the shopper changes size.
 */
import { flavorCopyFor } from "@/lib/flavor-copy";
import type { ReviewSummary } from "@/lib/reviews";
import type { Product, ProductImage } from "@/lib/shopify";
import { formatPrice } from "@/lib/utils";

export interface FlavorTile {
  name: string;
  handle10: string;
  handle20: string | null;
  image10: string | null;
  image20: string | null;
  current: boolean;
}

export interface FlavorSizeOption {
  servings: 10 | 20;
  label: string;
  bestValue: boolean;
  perServing: string;
  ingredientText: string | null;
  citricNote: string | null;
  labelImages: ProductImage[];
  product: Product & { images: ProductImage[] };
}

export interface FlavorPageModel {
  heading: string;
  flavorName: string;
  initialServings: 10 | 20;
  shortCopy: string;
  moreCopy: string;
  sizes: FlavorSizeOption[];
  tiles: FlavorTile[];
  review: ReviewSummary | null;
}

export const FLAVOR_PAGE_HEADING = "PUREST Real Fruit, Real Salt Electrolytes";

export interface FlavorGroup {
  name: string;
  handles: { 10: string; 20: string };
}

/** Tile order matches the shopper facing flavor list. */
export const FLAVOR_GROUPS: FlavorGroup[] = [
  {
    name: "Chocolate Cordyceps",
    handles: { 10: "10-count-chocolate-cordyceps-1", 20: "20-servings-chocolate-cordyceps" },
  },
  {
    name: "Cranberry",
    handles: { 10: "10-servings-cranberry", 20: "20-servings-cranberry" },
  },
  {
    name: "Ginger Lime",
    handles: { 10: "10-count-ginger-limeaid", 20: "20-servings-ginger-lime" },
  },
  {
    name: "Hibiscus Lime",
    handles: { 10: "10-count-hibiscus-lime", 20: "20-servings-hibiscus-lime" },
  },
  {
    name: "Passion Cherry",
    handles: { 10: "10-serving-passion-cherry", 20: "20-servings-passion-cherry" },
  },
];

const DASHES = /[\u2010\u2011\u2012\u2013\u2014\u2212-]+/g;

/** Removes hyphens and dash punctuation from copy shown to shoppers. */
export function withoutDashes(value: string): string {
  return value.replace(DASHES, " ").replace(/\s+/g, " ").trim();
}

export function matchFlavor(handle: string): (FlavorGroup & { servings: 10 | 20 }) | null {
  for (const group of FLAVOR_GROUPS) {
    if (group.handles[10] === handle) return { ...group, servings: 10 };
    if (group.handles[20] === handle) return { ...group, servings: 20 };
  }
  return null;
}

export function jarLabel(servings: 10 | 20): string {
  return servings === 20 ? "20 Serving Jar" : "10 Serving Jar";
}

export function perServingLabel(amount: string, servings: number, currency: string): string {
  const each = parseFloat(amount) / servings;
  if (!Number.isFinite(each)) return "";
  return `${formatPrice(each, currency)} per serving`;
}

export function flavorBlurbs(
  handle: string,
  title: string,
  fallback: string,
): { shortCopy: string; moreCopy: string } {
  const copy = flavorCopyFor(handle, title);
  const shortCopy = withoutDashes(copy?.tagline || fallback);
  const story = withoutDashes(copy?.story || "");
  return { shortCopy, moreCopy: story && story !== shortCopy ? story : "" };
}

function fileName(url: string): string {
  return decodeURIComponent((url.split("?")[0] ?? url).split("/").pop() ?? "").toLowerCase();
}

/** Ingredient and nutrition files for the selected jar. Sized files must match that jar. */
export function labelImagesFor(images: ProductImage[], servings: number): ProductImage[] {
  return images
    .filter((image) => {
      const file = fileName(image.url);
      if (!/ingredient|nutrition|how-to-use|how_to_use/.test(file)) return false;
      const sized = file.match(/(\d+)[-_\s]?serving/);
      if (sized) return Number(sized[1]) === servings;
      return true;
    })
    .sort((a, b) => {
      const aNutrition = /nutrition/.test(fileName(a.url)) ? 1 : 0;
      const bNutrition = /nutrition/.test(fileName(b.url)) ? 1 : 0;
      return aNutrition - bNutrition;
    });
}
