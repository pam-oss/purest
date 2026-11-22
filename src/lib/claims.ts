/**
 * Approved label wording. Flavor, kit, and bottle descriptions still arrive
 * from Shopify at build time, so the same replacements run on that HTML.
 */

const RITUAL_KIT_BEFORE =
  "Real freeze-dried fruit. French gray sea salt. 85+ trace minerals. 700+ mg naturally occurring sodium per serving. Zero added sugar, no natural flavors, no maltodextrin, and no anti-caking agents.";
const RITUAL_KIT_AFTER =
  "Real freeze-dried fruit. Guérande sea salt with 85+ trace minerals. 700+ mg sodium per serving. Zero added sugar, no natural flavors, no maltodextrin, and no anti-caking agents.";

const SCIENCE_SODIUM_BEFORE =
  "Across our collection, you will find over 700mg of naturally occurring Sodium per serving and a broad spectrum of over 85+trace minerals from our sea salt blend.";
const SCIENCE_SODIUM_AFTER =
  "Across our collection, you will find 700+ mg sodium per serving and 85+ trace minerals from Guérande sea salt.";

const NO_JUNK_AFTER =
  "No natural flavors, no maltodextrin, no artificial dyes, no anti-caking agents";

export function rewriteApprovedClaims(text: string, handle = ""): string {
  if (!text) return text;
  let next = text;

  next = next.replaceAll(RITUAL_KIT_BEFORE, RITUAL_KIT_AFTER);
  next = next.replaceAll(SCIENCE_SODIUM_BEFORE, SCIENCE_SODIUM_AFTER);
  next = next.replaceAll(
    "Real freeze-dried fruit. French gray sea salt. Nothing else.",
    "Real freeze-dried fruit. Guérande sea salt with 85+ trace minerals. Real hydration.",
  );
  next = next.replaceAll(
    "700+ mg naturally occurring sodium per serving",
    "700+ mg sodium per serving",
  );
  next = next.replaceAll(
    "mg naturally occurring sodium per serving",
    "mg sodium per serving",
  );
  next = next.replace(/Real fruit\. Real salt\. Nothing else\./g, "Real Fruit. Real Salt. Real Hydration.");
  next = next.replace(
    /Glass ensures that you taste only your water and our premium electrolyte mixes\s*[\u2013\u2014-]\s*nothing else\./gi,
    "Glass ensures that you taste only your water and our premium electrolyte mixes.",
  );
  next = next.replaceAll("No junk. Ever.", NO_JUNK_AFTER);

  if (handle.includes("chocolate-cordyceps")) {
    next = next.replaceAll(
      "The real fruit electrolyte in a clear glass jar.",
      "Chocolate Cordyceps in a clear glass jar.",
    );
    next = next.replaceAll(
      "the real fruit electrolyte in a clear glass jar.",
      "Chocolate Cordyceps in a clear glass jar.",
    );
    next = next.replaceAll(
      "combines organic freeze-dried fruit with",
      "combines organic cacao and organic cordyceps with",
    );
    next = next.replaceAll(
      "combined with organic real fruit",
      "combined with organic cacao and organic cordyceps",
    );
  }

  // Catch any leftover flagged phrase in Shopify HTML after the exact swaps.
  next = next.replace(/\bnaturally occurring\b\s*/gi, "");
  next = next.replace(/[ \t]{2,}/g, " ");
  next = next.replace(/\s+([.,;:])/g, "$1");

  return rewriteSentenceDashes(next);
}

/** Turns em dashes, en dashes, and spaced hyphens into normal sentence punctuation. */
function rewriteSentenceDashes(text: string): string {
  let next = text;
  next = next.replace(/(\d+)\s*[–—]\s*(\d+)/g, "$1 to $2");
  next = next.replace(/spectrum(<\/strong>)?\s*[—–]\s*/gi, "spectrum$1, ");
  next = next.replace(/Electrolyte\s*[—–]\s*/g, "Electrolyte, ");
  next = next.replace(/Hydration Kit\s*[—–]\s*/g, "Hydration Kit, and ");
  next = next.replace(/backorder(<\/strong>)?\s*[—–]\s*/gi, "backorder$1. ");
  next = next.replace(/Water Bottle\s*[—–]\s*/g, "Water Bottle, ");
  next = next.replace(/(^|[\n>])\s*[—–]\s*/g, "$1");
  next = next.replace(/\s*[—–]\s*(?=[A-Z])/g, ". ");
  next = next.replace(/\s*[—–]\s*/g, ", ");
  next = next.replace(/ - /g, ", ");
  next = next.replace(/\s+,/g, ",");
  next = next.replace(/,\s*\./g, ".");
  next = next.replace(/[ \t]{2,}/g, " ");
  return next;
}

export function applyProductClaims(
  handle: string,
  description: string,
  descriptionHtml: string,
): { description: string; descriptionHtml: string } {
  return {
    description: rewriteApprovedClaims(description, handle),
    descriptionHtml: rewriteApprovedClaims(descriptionHtml, handle),
  };
}
