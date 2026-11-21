/**
 * Browser helpers for the Meta Pixel.
 *
 * The pixel ID is public (it is visible in the page source). The Conversions
 * API access token is not handled here — that stays in the server route.
 *
 * There is no cookie-consent banner on this site. Google Analytics already
 * loads on every page, and the pixel follows that same behavior.
 */

export const DEFAULT_META_PIXEL_ID = "1620730405294374";

export type MetaEventName = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout";

export interface MetaContent {
  id: string;
  quantity: number;
  item_price?: number;
}

export interface MetaCustomData {
  content_ids?: string[];
  content_type?: "product" | "product_group";
  content_name?: string;
  contents?: MetaContent[];
  currency?: string;
  value?: number;
  num_items?: number;
}

declare global {
  interface Window {
    purestTrackMeta?: (eventName: MetaEventName, customData?: MetaCustomData) => Promise<void>;
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

/** Accepts a dataset id from the env, otherwise the Purest Electrolyte pixel. */
export function resolveMetaPixelId(raw: string | undefined | null): string {
  const value = (raw ?? "").trim();
  return /^\d{8,20}$/.test(value) ? value : DEFAULT_META_PIXEL_ID;
}

export const META_PIXEL_ID = resolveMetaPixelId(import.meta.env.PUBLIC_META_PIXEL_ID);

/**
 * Shopify catalogs connected to this pixel identify a sellable item by the
 * numeric variant id (`gid://shopify/ProductVariant/123` → `123`).
 * Ids that are not Shopify GIDs are left unchanged.
 */
export function shopifyNumericId(id: string): string {
  const trimmed = id.trim();
  const gid = trimmed.match(/\/(\d+)\s*$/);
  if (gid) return gid[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return trimmed;
}

/**
 * Fires a standard pixel event and asks our server route to send the matching
 * Conversions API event. Both calls share one event id so Meta counts them once.
 * Never throws — tracking must not block add-to-cart or checkout.
 */
export function trackMetaEvent(eventName: MetaEventName, customData?: MetaCustomData): Promise<void> {
  if (typeof window === "undefined" || typeof window.purestTrackMeta !== "function") {
    return Promise.resolve();
  }
  try {
    return Promise.resolve(window.purestTrackMeta(eventName, customData)).catch(() => undefined);
  } catch {
    return Promise.resolve();
  }
}
