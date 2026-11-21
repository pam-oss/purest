export const prerender = false;

import type { APIRoute } from "astro";
import {
  MetaEventInputError,
  buildCapiPayload,
  capiEndpoint,
  isAllowedSiteUrl,
  sanitizeClientIp,
} from "@/lib/meta-capi";
import { resolveMetaPixelId } from "@/lib/meta";

const MAX_BODY_BYTES = 16_000;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Read a secret at request time. Bracket access keeps Vite from inlining the
 * value into the build, so Pam can add it in Vercel later without a code change.
 * This file is a server route and is never shipped to the browser.
 */
function runtimeEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const value = env?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const token = runtimeEnv("META_CAPI_ACCESS_TOKEN");
  if (!token) {
    return json(200, { ok: true, skipped: true });
  }

  const origin = request.headers.get("origin");
  if (origin && !isAllowedSiteUrl(origin)) {
    return json(403, { ok: false });
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return json(400, { ok: false });
  }
  if (!text || text.length > MAX_BODY_BYTES) {
    return json(413, { ok: false });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { ok: false });
  }

  let ip: string | undefined;
  try {
    ip = sanitizeClientIp(clientAddress);
  } catch {
    ip = undefined;
  }
  if (!ip) ip = sanitizeClientIp(request.headers.get("x-forwarded-for"));

  let payload;
  try {
    payload = buildCapiPayload(body, {
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
      testEventCode: runtimeEnv("META_CAPI_TEST_EVENT_CODE"),
    });
  } catch (error) {
    if (error instanceof MetaEventInputError) return json(400, { ok: false });
    console.error("[meta-capi] Could not prepare the event");
    return json(400, { ok: false });
  }
  if (!payload) return json(200, { ok: true, skipped: true });

  const pixelId = resolveMetaPixelId(runtimeEnv("PUBLIC_META_PIXEL_ID"));
  const endpoint = new URL(capiEndpoint(pixelId));
  endpoint.searchParams.set("access_token", token);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json().catch(() => null)) as {
      error?: { code?: number };
      events_received?: number;
    } | null;
    if (!response.ok || result?.error || result?.events_received === 0) {
      const code = result?.error?.code;
      console.error(`[meta-capi] Meta returned ${response.status}${code ? ` code ${code}` : ""}`);
      return json(502, { ok: false });
    }
    return json(200, { ok: true });
  } catch {
    console.error("[meta-capi] Meta could not be reached");
    return json(502, { ok: false });
  }
};
