/**
 * Local preview of the live Shopify catalog when the Storefront token is not
 * on this machine. Production builds use the Storefront API instead.
 * Enable with PUBLIC_PUREST_PUBLIC_CATALOG=1.
 */
import { applyProductClaims } from "@/lib/claims";
import { displayProductTitle } from "@/lib/product-title";
import type { Money, Product, ProductImage, SellingPlanGroup } from "@/lib/shopify";

export type CatalogProduct = Product & { images: ProductImage[] };

const PRICE_OVERRIDES: Record<string, string> = {
  "5-day-hydration-kit": "16.99",
};

let pending: Promise<CatalogProduct[]> | null = null;

export function loadPublicCatalog(): Promise<CatalogProduct[]> {
  if (!pending) pending = fetchCatalog().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}

function shopDomain(): string {
  return import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN || "6d47f8-3c.myshopify.com";
}

interface RawImage {
  src: string;
  position: number;
}

interface RawVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  available: boolean;
}

interface RawProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string | null;
  variants: RawVariant[];
  images: RawImage[];
}

interface RawPlan {
  id: number;
  name: string;
  description: string | null;
  price_adjustments?: { value_type: string; value: number }[];
}

interface RawPlanGroup {
  name: string;
  selling_plans?: RawPlan[];
}

async function fetchCatalog(): Promise<CatalogProduct[]> {
  const shop = shopDomain();
  const response = await fetch(`https://${shop}/products.json?limit=250`, {
    headers: { Accept: "application/json", "User-Agent": "PurestStorefront" },
  });
  if (!response.ok) {
    throw new Error(`Public Shopify catalog failed (${response.status})`);
  }
  const data = (await response.json()) as { products?: RawProduct[] };
  const products = data.products ?? [];
  return Promise.all(products.map((raw) => mapProduct(shop, raw)));
}

async function mapProduct(shop: string, raw: RawProduct): Promise<CatalogProduct> {
  const images = [...(raw.images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((image) => ({ url: image.src, altText: null }));
  const currency = "USD";
  const copy = applyProductClaims(raw.handle, textFromHtml(raw.body_html ?? ""), raw.body_html ?? "");
  const override = PRICE_OVERRIDES[raw.handle];
  const variants = (raw.variants ?? []).map((variant) => {
    const amount = override ?? variant.price;
    const compare = variant.compare_at_price && Number(variant.compare_at_price) > 0
      ? { amount: variant.compare_at_price, currencyCode: currency }
      : null;
    return {
      id: `gid://shopify/ProductVariant/${variant.id}`,
      title: variant.title,
      price: { amount, currencyCode: currency },
      compareAtPrice: compare,
      availableForSale: Boolean(variant.available),
    };
  });
  const min = variants[0]?.price ?? { amount: override ?? "0.00", currencyCode: currency };
  const product: CatalogProduct = {
    id: `gid://shopify/Product/${raw.id}`,
    title: displayProductTitle(raw.title),
    handle: raw.handle,
    description: copy.description,
    descriptionHtml: copy.descriptionHtml,
    priceRange: { minVariantPrice: min },
    image: images[0] ?? null,
    images,
    variants,
    sellingPlanGroups: await sellingPlans(shop, raw.handle, currency),
  };
  if (override) {
    const price: Money = { amount: override, currencyCode: currency };
    product.priceRange = { minVariantPrice: price };
    product.variants = product.variants.map((variant) => ({ ...variant, price }));
  }
  return product;
}

async function sellingPlans(shop: string, handle: string, currency: string): Promise<SellingPlanGroup[]> {
  try {
    const response = await fetch(`https://${shop}/products/${handle}.js`, {
      headers: { Accept: "application/json", "User-Agent": "PurestStorefront" },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { selling_plan_groups?: RawPlanGroup[] };
    return (data.selling_plan_groups ?? []).map((group) => ({
      name: group.name,
      sellingPlans: (group.selling_plans ?? []).map((plan) => ({
        id: `gid://shopify/SellingPlan/${plan.id}`,
        name: plan.name,
        description: plan.description,
        priceAdjustments: (plan.price_adjustments ?? []).map((adjustment) => ({
          adjustmentValue: mapAdjustment(adjustment, currency),
        })),
      })),
    }));
  } catch {
    return [];
  }
}

function mapAdjustment(
  adjustment: { value_type: string; value: number },
  currency: string,
): { adjustmentPercentage: number } | { adjustmentAmount: Money } | { price: Money } {
  if (adjustment.value_type === "fixed_amount") {
    return { adjustmentAmount: { amount: (adjustment.value / 100).toFixed(2), currencyCode: currency } };
  }
  if (adjustment.value_type === "price") {
    return { price: { amount: (adjustment.value / 100).toFixed(2), currencyCode: currency } };
  }
  return { adjustmentPercentage: adjustment.value };
}

function textFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
