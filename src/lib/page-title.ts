/**
 * Document titles. Layout writes this same string into <title>, og:title,
 * and twitter:title. Brand comes first. Segments are separated with " | ".
 * Dashes are removed so a Shopify article title cannot put one back in.
 */
import { matchFlavor } from "@/lib/flavors";
import { displayProductTitle, flavorNameFromCatalogTitle } from "@/lib/product-title";

const DASHES = /[\u2010\u2011\u2012\u2013\u2014\u2212-]+/g;

export const BEST_DRINK_MIX = "The Best Real Fruit Electrolyte Drink Mix";
export const PREMIUM_SALT_JAR = "Premium French Sea Salt Hydration in a Glass Jar";
const ORGANIC_INGREDIENTS = "Organic Ingredients";

export const HOME_TITLE = `Purest Electrolyte | ${BEST_DRINK_MIX} | ${PREMIUM_SALT_JAR} | ${ORGANIC_INGREDIENTS}`;
export const PRODUCTS_INDEX_TITLE = "Purest Electrolyte | Shop Real Fruit Electrolytes in Glass Jars";

export function stripTitleDashes(value: string): string {
  return value.replace(DASHES, " ").replace(/\s+/g, " ").trim();
}

export function brandPageTitle(pageName: string): string {
  const name = stripTitleDashes(pageName);
  return name ? `Purest Electrolyte | ${name}` : "Purest Electrolyte";
}

/**
 * Flavor jars, old titles ("Ginger Lime 10 Servings") and the piped Shopify
 * titles ("PUREST Real Fruit, Real Salt Electrolytes | Ginger Lime | 20 Servings").
 */
function flavorFromTitle(title: string): string | null {
  return flavorNameFromCatalogTitle(title);
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

  if (handle === "5-day-hydration-kit" || /5 day (hydration )?kit/i.test(display)) {
    return "Purest Electrolyte | 5 Day Organic Real Fruit Hydration Kit";
  }

  if (handle === "the-hydration-ritual-kit" || /ritual kit/i.test(display)) {
    return "Purest Electrolyte | The Hydration Ritual Kit | Organic Real Fruit";
  }

  // Handles stay stable when Shopify renames the title. Title parsing covers
  // a jar whose handle is not in the flavor map yet.
  const flavor = matchFlavor(product.handle)?.name ?? flavorFromTitle(product.title);
  if (flavor) {
    return `Purest ${flavor} | ${BEST_DRINK_MIX} | ${PREMIUM_SALT_JAR} | ${ORGANIC_INGREDIENTS}`;
  }

  const name = display.replace(/^Purest\s+/i, "");
  return brandPageTitle(name);
}
