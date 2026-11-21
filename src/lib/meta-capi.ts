/**
 * Pure helpers for the Conversions API route.
 * No secrets and no network calls live here, so this file is safe to import
 * from tests. The access token is read only inside the server route.
 */

import { resolveMetaPixelId, type MetaEventName } from "@/lib/meta";

export const META_GRAPH_VERSION = "v25.0";

const ALLOWED_EVENTS = new Set<MetaEventName>([
  "PageView",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
]);

const ALLOWED_HOSTS = new Set([
  "purestelectrolyte.com",
  "www.purestelectrolyte.com",
  "localhost",
  "127.0.0.1",
]);

export interface CapiRequestContext {
  ip?: string;
  userAgent?: string;
  pixelId?: string;
  testEventCode?: string;
}

export interface CapiPayload {
  data: Record<string, unknown>[];
  test_event_code?: string;
}

export class MetaEventInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaEventInputError";
  }
}

function cleanText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLength);
}

function cleanId(value: unknown): string | undefined {
  const text = cleanText(value, 80);
  if (!text || !/^[A-Za-z0-9_.:-]{1,80}$/.test(text)) return undefined;
  return text;
}

function cleanMoney(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(number) || number < 0 || number > 1_000_000) return undefined;
  return Math.round(number * 100) / 100;
}

function cleanCount(value: unknown, max: number): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(number) || number < 1 || number > max) return undefined;
  return number;
}

export function isAllowedSiteUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return url.protocol === "http:" || url.protocol === "https:";
  if (ALLOWED_HOSTS.has(host)) return url.protocol === "https:";
  if (host.endsWith(".vercel.app")) return url.protocol === "https:";
  return false;
}

export function sanitizeSourceUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length > 2000 || !isAllowedSiteUrl(raw)) return undefined;
  const url = new URL(raw);
  url.hash = "";
  return url.toString();
}

export function sanitizeClientIp(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const first = raw.split(",")[0]?.trim();
  if (!first || first.length > 64) return undefined;
  const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  if (ipv4.test(first)) {
    const octets = first.split(".").map((part) => Number(part));
    if (octets.some((part) => part > 255)) return undefined;
    return first;
  }
  if (first.includes(":") && ipv6.test(first)) return first;
  return undefined;
}

function sanitizeFbp(raw: unknown): string | undefined {
  const value = cleanText(raw, 80);
  if (!value || !/^fb\.\d+\.\d+\.\d{1,20}$/.test(value)) return undefined;
  return value;
}

function sanitizeFbc(raw: unknown): string | undefined {
  const value = cleanText(raw, 560);
  if (!value || !/^fb\.\d+\.\d+\.[A-Za-z0-9_-]{1,500}$/.test(value)) return undefined;
  return value;
}

/** Same shape the pixel writes into the _fbc cookie when a visit has fbclid. */
function fbcFromFbclid(raw: unknown): string | undefined {
  const fbclid = cleanText(raw, 500);
  if (!fbclid || !/^[A-Za-z0-9_-]{1,500}$/.test(fbclid)) return undefined;
  return `fb.1.${Date.now()}.${fbclid}`;
}

function sanitizeCustomData(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const input = raw as Record<string, unknown>;
  const custom: Record<string, unknown> = {};

  if (Array.isArray(input.content_ids)) {
    const ids = input.content_ids.map(cleanId).filter((id): id is string => Boolean(id)).slice(0, 30);
    if (ids.length) custom.content_ids = ids;
  }

  if (input.content_type === "product" || input.content_type === "product_group") {
    custom.content_type = input.content_type;
  }

  const contentName = cleanText(input.content_name, 200);
  if (contentName) custom.content_name = contentName;

  if (Array.isArray(input.contents)) {
    const contents = input.contents.slice(0, 30).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const id = cleanId(record.id);
      const quantity = cleanCount(record.quantity, 999);
      if (!id || !quantity) return [];
      const entry: Record<string, unknown> = { id, quantity };
      const itemPrice = cleanMoney(record.item_price);
      if (itemPrice !== undefined) entry.item_price = itemPrice;
      return [entry];
    });
    if (contents.length) custom.contents = contents;
  }

  const currency = cleanText(input.currency, 3)?.toUpperCase();
  if (currency && /^[A-Z]{3}$/.test(currency)) custom.currency = currency;

  const value = cleanMoney(input.value);
  if (value !== undefined) custom.value = value;

  const numItems = cleanCount(input.num_items, 999);
  if (numItems !== undefined) custom.num_items = numItems;

  return Object.keys(custom).length ? custom : undefined;
}

export function sanitizeTestEventCode(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value || !/^TEST[A-Z0-9]{1,32}$/.test(value)) return undefined;
  return value;
}

/**
 * Builds the JSON body Meta expects. Throws MetaEventInputError for anything
 * we should not forward. Returns null when there is no visitor signal at all
 * (Meta requires at least one user_data field).
 */
export function buildCapiPayload(body: unknown, context: CapiRequestContext): CapiPayload | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new MetaEventInputError("Event body must be an object");
  }
  const input = body as Record<string, unknown>;
  const eventName = input.event_name;
  if (typeof eventName !== "string" || !ALLOWED_EVENTS.has(eventName as MetaEventName)) {
    throw new MetaEventInputError("Unsupported event");
  }

  const eventId = cleanText(input.event_id, 64);
  if (!eventId || !/^[A-Za-z0-9-]{8,64}$/.test(eventId)) {
    throw new MetaEventInputError("Invalid event id");
  }

  const eventSourceUrl = sanitizeSourceUrl(input.event_source_url);
  if (!eventSourceUrl) {
    throw new MetaEventInputError("Invalid event source URL");
  }

  const userData: Record<string, string> = {};
  const ip = sanitizeClientIp(context.ip);
  const userAgent = cleanText(context.userAgent, 512);
  const fbp = sanitizeFbp(input.fbp);
  const fbc = sanitizeFbc(input.fbc) ?? fbcFromFbclid(input.fbclid);
  if (ip) userData.client_ip_address = ip;
  if (userAgent) userData.client_user_agent = userAgent;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;
  if (!Object.keys(userData).length) return null;

  const event: Record<string, unknown> = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: eventSourceUrl,
    action_source: "website",
    user_data: userData,
  };
  const customData = sanitizeCustomData(input.custom_data);
  if (customData) event.custom_data = customData;

  const payload: CapiPayload = { data: [event] };
  const testEventCode = sanitizeTestEventCode(context.testEventCode);
  if (testEventCode) payload.test_event_code = testEventCode;
  return payload;
}

export function capiEndpoint(pixelId: string | undefined): string {
  const id = resolveMetaPixelId(pixelId);
  return `https://graph.facebook.com/${META_GRAPH_VERSION}/${id}/events`;
}
