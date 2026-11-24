/**
 * Pam used to name jars with the size first ("10 Servings Ginger Lime").
 * Titles now put the flavor first ("Ginger Lime 10 Servings").
 * Keep a trailing size exactly as it is written. If a title still leads
 * with the size, move that size to the end instead of dropping it.
 */
const LEADING_SERVING_SIZE = /^(\d+)\s+servings?\s+(.+)$/i;

export function displayProductTitle(title: string): string {
  const trimmed = title.trim();
  const leading = trimmed.match(LEADING_SERVING_SIZE);
  if (!leading) return trimmed;
  const flavor = leading[2].replace(/\s+/g, " ").trim();
  if (!flavor) return trimmed;
  return `${flavor} ${leading[1]} Servings`;
}
