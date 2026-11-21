/// <reference path="../.astro/types.d.ts" />

// Tells TypeScript about our env vars so import.meta.env.PUBLIC_* is typed.
// All env vars must be prefixed with PUBLIC_ to be exposed to the browser.
interface ImportMetaEnv {
  readonly PUBLIC_SHOPIFY_STORE_DOMAIN: string;
  readonly PUBLIC_SHOPIFY_STOREFRONT_TOKEN: string;
  /** Meta dataset / pixel id. Public. Falls back to the Purest Electrolyte dataset. */
  readonly PUBLIC_META_PIXEL_ID?: string;
  /** Meta's facebook-domain-verification code. Omit the tag when this is empty. */
  readonly PUBLIC_FB_DOMAIN_VERIFICATION?: string;
  /** Server-only. Never expose this to the browser. */
  readonly META_CAPI_ACCESS_TOKEN?: string;
  /** Optional Events Manager test code (TEST...). Leave unset for real traffic. */
  readonly META_CAPI_TEST_EVENT_CODE?: string;
  readonly RESEND_API_KEY?: string;
  readonly CONTACT_FROM_EMAIL?: string;
  readonly SMTP_HOST?: string;
  readonly SMTP_PORT?: string;
  readonly SMTP_SECURE?: string;
  readonly SMTP_USER?: string;
  readonly SMTP_PASS?: string;
  readonly GMAIL_USER?: string;
  readonly GMAIL_APP_PASSWORD?: string;
  readonly EMAIL_USER?: string;
  readonly EMAIL_PASS?: string;
  readonly EMAIL_PASSWORD?: string;
  readonly TELEGRAM_BOT_TOKEN?: string;
  readonly NOTIFICATION_CHAT_ID?: string;
  readonly KLAVIYO_PRIVATE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
