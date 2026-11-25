/**
 * Document titles. Layout writes this same string into <title>, og:title,
 * and twitter:title. Brand comes first. Segments are separated with " | ".
 * Dashes are removed so a Shopify article title cannot put one back in.
 */
import { displayProductTitle } from "@/lib/product-title";

const DASHES = /[\u2010\u2011\u2012\u2013\u2014\u2212-]+/g;

/** Longer names first so "Ginger Lime" is not cut out of a longer flavor. */
const FLAVOR_NAMES = [
  "Chocolate Cordyceps",
  "Passion Cherry",
  "Hibiscus Lime",
  "Ginger Lime",
  "Cranberry",
];

export const BEST_DRINK_MIX = "The Best Organic Real Fruit Electrolyte Drink Mix";
export const PREMIUM_SALT_JAR = "Premium French Sea Salt Hydration in a Glass Jar";

export const HOME_TITLE = `Purest Electrolyte | ${BEST_DRINK_MIX} | ${PREMIUM_SALT_JAR}`;
export const PRODUCTS_INDEX_TITLE = "Purest Electrolyte | Shop Real Fruit Electrolytes in Glass Jars";

export function stripTitleDashes(value: string): string {
  return value.replace(DASHES, " ").replace(/\s+/g, " ").trim();
}

export function brandPageTitle(pageName: string): string {
  const name = stripTitleDashes(pageName);
  return name ? `Purest Electrolyte | ${name}` : "Purest Electrolyte";
}

function flavorFromTitle(title: string): string | null {
  const display = stripTitleDashes(displayProductTitle(title)).toLowerCase();
  return FLAVOR_NAMES.find((flavor) => display.includes(flavor.toLowerCase())) ?? null;
}

/**
 * Flavor jars use Pam's product pattern. Kits and the water bottle do not
 * claim to be a drink mix in a glass jar.
 */
export function productPageTitle(product: { title: string; handle: string }): string {
  const display = stripTitleDashes(displayProductTitle(product.title));
  const handle = product.handle.toLowerCase();

  if (handle.includes("water-bottle") || /water bottle/i.test(display)) {
    return "Purest Electrolyte | Glass Water Bottle for Hydration";
  }

  if (handle === "5-day-hydration-kit" || /5 day hydration kit/i.test(display)) {
    return "Purest Electrolyte | 5 Day Organic Real Fruit Hydration Kit";
  }

  if (handle === "the-hydration-ritual-kit" || /hydration ritual kit/i.test(display)) {
    return "Purest Electrolyte | The Hydration Ritual Kit | Organic Real Fruit";
  }

  const flavor = flavorFromTitle(product.title);
  if (flavor) {
    return `Purest ${flavor} | ${BEST_DRINK_MIX} | ${PREMIUM_SALT_JAR}`;
  }

  const name = display.replace(/^Purest\s+/i, "");
  return brandPageTitle(name);
}
