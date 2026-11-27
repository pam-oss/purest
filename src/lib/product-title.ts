/**
 * Shopper facing product names.
 *
 * Shopify titles arrive in either shape:
 *   old: "Ginger Lime 10 Servings" or "10 Servings Ginger Lime"
 *   new: "PUREST Real Fruit, Real Salt Electrolytes | Ginger Lime | 20 Servings"
 * Kits use the same new prefix ("... | 5 Day Kit", "... | Hydration Ritual Kit").
 * The water bottle is "PUREST | Glass Water Bottle".
 *
 * Cards, the cart, and document title flavor detection all read this shorter
 * name. Handles stay the source of truth for which jar a page is.
 */

const LEADING_SERVING_SIZE = /^(\d+)\s+servings?\s+(.+)$/i;
const FULL_HEADING = /^purest real fruit,\s*real salt electrolytes$/i;
const PUREST_ONLY = /^purest$/i;
const SERVING_SEGMENT = /^(\d+)\s+servings?$/i;

/** Longer names first so "Ginger Lime" is not cut out of a longer flavor. */
export const CATALOG_FLAVORS = [
  "Passion Cherry",
  "Hibiscus Lime",
  "Ginger Lime",
  "Chocolate",
  "Cranberry",
] as const;

/** Shopify still titles this jar "Chocolate Cordyceps". Cards and the cart show "Chocolate". */
function shopperChocolateName(value: string): string {
  return value.replace(/\bChocolate Cordyceps\b/g, "Chocolate");
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Segments after the shared PUREST heading.
 * Returns null for older titles that are not pipe separated.
 */
export function catalogSegments(title: string): string[] | null {
  if (!title.includes("|")) return null;
  const parts = title.split("|").map((part) => clean(part)).filter(Boolean);
  if (parts.length < 2) return null;
  if (FULL_HEADING.test(parts[0]) || PUREST_ONLY.test(parts[0])) return parts.slice(1);
  return null;
}

export function displayProductTitle(title: string): string {
  const trimmed = shopperChocolateName(clean(title));
  const segments = catalogSegments(trimmed);
  if (segments) {
    const size = clean(segments[segments.length - 1]).match(SERVING_SEGMENT);
    if (size && segments.length >= 2) {
      const flavor = clean(segments.slice(0, -1).join(" "));
      if (flavor) return `${flavor} ${size[1]} Servings`;
    }
    return clean(segments.join(" "));
  }

  const leading = trimmed.match(LEADING_SERVING_SIZE);
  if (!leading) return trimmed;
  const flavor = clean(leading[2]);
  if (!flavor) return trimmed;
  return `${flavor} ${leading[1]} Servings`;
}

function knownFlavor(value: string): (typeof CATALOG_FLAVORS)[number] | null {
  const normalized = value.toLowerCase();
  return (
    CATALOG_FLAVORS.find((flavor) => {
      const name = flavor.toLowerCase();
      return normalized === name || normalized.includes(name);
    }) ?? null
  );
}

/** Flavor name from either Shopify title shape. Null for kits and the bottle. */
export function flavorNameFromCatalogTitle(title: string): string | null {
  const segments = catalogSegments(title);
  if (segments) {
    for (const segment of segments) {
      const match = knownFlavor(segment);
      if (match) return match;
    }
  }
  return knownFlavor(displayProductTitle(title));
}
