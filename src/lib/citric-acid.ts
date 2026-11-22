/**
 * Citric acid wording. Product descriptions still arrive from Shopify, so the
 * same replacements run on that HTML at build time.
 */
import copy from "@/data/citric-acid.json";

export const citricAcidFlavorNote = copy.flavorNote;
export const citricAcidKitNote = copy.kitNote;
export const citricAcidFaqAnswer = copy.faqAnswer;
export const citricAcidListItem = copy.listItem;

const LABEL_FILES = copy.labels as Record<string, { name: string; ingredients: string }>;
const KIT_FILE = copy.kitFile;

const CITRIC_SENTENCE = copy.faqAnswer;

function filenameFromUrl(url: string): string {
  const path = url.split("?")[0] ?? url;
  return path.split("/").pop() ?? "";
}

/** Rewrites citric acid phrases in Shopify HTML without touching other claims. */
export function rewriteCitricAcid(text: string): string {
  let next = text;

  next = next.replaceAll(
    "Citric acid is found naturally in citrus fruits like lemons and limes, giving them their tart, sour taste. We use the purest NONGMO citric acid to balance the flavour of our products. Our citric acid is derived from non-GMO citrus fruits.",
    CITRIC_SENTENCE,
  );
  next = next.replaceAll(
    "Our citric acid is derived from cassava root, not mold.",
    CITRIC_SENTENCE,
  );
  next = next.replaceAll(
    "Our citric acid is derived from non-GMO citrus fruits.",
    CITRIC_SENTENCE,
  );
  next = next.replaceAll(
    "Our citric acid is derived from non GMO citrus fruits.",
    CITRIC_SENTENCE,
  );

  next = next.replace(
    /(?:non[\s\u2010-\u2015-]*gmo|nongmo)\s+([Cc]itric\s+[Aa]cid)\b(?!\s*\(fermented\b)/gi,
    "$1 (fermented from cassava root, non GMO)",
  );
  next = next.replace(
    /\bCitric Acid\b(?!\s*\(fermented\b)/g,
    "Citric Acid (fermented from cassava root, non GMO)",
  );

  return next;
}

export function applyCitricAcidLabel<T extends { url: string; altText?: string | null }>(image: T): T {
  const file = filenameFromUrl(image.url);
  const label = LABEL_FILES[file];
  if (label) {
    return {
      ...image,
      url: `/images/labels/${file}`,
      altText: `${label.name} ingredients: ${label.ingredients}`,
    };
  }
  if (file === KIT_FILE) {
    return {
      ...image,
      url: `/images/labels/${file}`,
      altText: `Nutrition facts and ingredients for the five day hydration kit. Ginger Lime, Hibiscus Lime, Cranberry, and Passion Cherry include citric acid (fermented from cassava root, non GMO).`,
    };
  }
  return image;
}

export function citricAcidNoteFromImages(images: { url: string }[]): string | null {
  const files = images.map((image) => filenameFromUrl(image.url));
  if (files.some((file) => file in LABEL_FILES)) return citricAcidFlavorNote;
  if (files.includes(KIT_FILE)) return citricAcidKitNote;
  return null;
}

export function ingredientListFromImages(images: { url: string }[]): string | null {
  for (const image of images) {
    const label = LABEL_FILES[filenameFromUrl(image.url)];
    if (label) return label.ingredients;
  }
  return null;
}
