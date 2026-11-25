import { useEffect, useState } from "react";
import { addToCart } from "@/lib/cart-store";
import { flavorCopyFor } from "@/lib/flavor-copy";
import type { Product, SellingPlan } from "@/lib/shopify";
import { displayProductTitle } from "@/lib/product-title";
import { formatPrice } from "@/lib/utils";

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const hasVariants = product.variants.length > 1;
  const variant = product.variants.find((v) => v.availableForSale) ?? product.variants[0];
  const price = variant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = variant?.compareAtPrice;
  const soldOut = !variant?.availableForSale;
  const isBundle = product.handle === 'the-hydration-ritual-kit';
  const displayTitle = displayProductTitle(product.title);
  const tagline = flavorCopyFor(product.handle, product.title)?.tagline ?? product.description;

  // All subscription plans
  const allPlans: SellingPlan[] = (product.sellingPlanGroups ?? []).flatMap((g) => g.sellingPlans);
  const hasSubscription = allPlans.length > 0 && !hasVariants && !soldOut;

  // State: is the frequency picker open?
  const [showFrequency, setShowFrequency] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(allPlans[0]?.id ?? "");
  const [isHydrated, setIsHydrated] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Astro renders the buttons before React attaches their event handlers. Keep
  // them visibly unavailable during that short window so an early mobile tap
  // cannot be silently lost.
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const selectedPlan = allPlans.find((p) => p.id === selectedPlanId) ?? allPlans[0];

  // Get subscribe price for a given plan
  function getPlanPrice(plan: SellingPlan): string | null {
    if (!plan || !price) return null;
    const adj = plan.priceAdjustments?.[0]?.adjustmentValue as any;
    const basePrice = parseFloat(price.amount);
    if (adj?.adjustmentPercentage) {
      const subPrice = basePrice * (1 - adj.adjustmentPercentage / 100);
      return formatPrice(subPrice.toFixed(2), price.currencyCode);
    }
    if (adj?.adjustmentAmount?.amount) {
      const subPrice = basePrice - parseFloat(adj.adjustmentAmount.amount);
      return formatPrice(subPrice.toFixed(2), price.currencyCode);
    }
    if (adj?.price?.amount) {
      return formatPrice(adj.price.amount, price.currencyCode);
    }
    return null;
  }

  // Get discount % label for a plan
  function getPlanDiscount(plan: SellingPlan): string {
    const adj = plan.priceAdjustments?.[0]?.adjustmentValue as any;
    if (adj?.adjustmentPercentage) return `${adj.adjustmentPercentage}% off`;
    return "Save";
  }

  // Friendly label shortening
  function shortLabel(name: string): string {
    if (/month/i.test(name) && !/2|3|two|three/i.test(name)) return "Monthly";
    if (/2.month|every 2/i.test(name)) return "Every 2 Mo";
    if (/3.month|every 3/i.test(name)) return "Every 3 Mo";
    return name;
  }

  function nameAndSize(title: string): { name: string; size: string | null } {
  const match = title.match(/^(.*?)\s+(\d+)\s+servings$/i);
  if (!match) return { name: title, size: null };
  return { name: match[1], size: `${match[2]} servings` };
}

function handleAdd() {
    if (!variant) return;
    addToCart({
      variantId: variant.id,
      productId: product.id,
      title: displayTitle,
      variantTitle: variant.title,
      price: parseFloat(price.amount),
      currencyCode: price.currencyCode,
      imageUrl: product.image?.url ?? null,
    });
    setShowFrequency(false);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  // Build CartPlan objects for the store
  function buildCartPlan(plan: SellingPlan) {
    const adj = plan.priceAdjustments?.[0]?.adjustmentValue as any;
    const discountPct = adj?.adjustmentPercentage ?? 0;
    return { id: plan.id, name: plan.name, discountPct };
  }

  function handleSubscribeConfirm() {
    if (!variant || !selectedPlan) return;
    addToCart({
      variantId: variant.id,
      productId: product.id,
      title: displayTitle,
      variantTitle: variant.title,
      price: parseFloat(price.amount),
      currencyCode: price.currencyCode,
      imageUrl: product.image?.url ?? null,
      sellingPlanId: selectedPlan.id,
      sellingPlanName: selectedPlan.name,
      availablePlans: allPlans.map(buildCartPlan),
    });
    setShowFrequency(false);
  }

  const firstPlanPrice = allPlans[0] ? getPlanPrice(allPlans[0]) : null;
  const selectedPlanPrice = selectedPlan ? getPlanPrice(selectedPlan) : null;
  const parts = nameAndSize(displayTitle);

  return (
    <article className="group flex flex-col">
      <a href={`/products/${product.handle}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-white p-4 ring-1 ring-black/20 sm:p-8 lg:p-12">
          {isBundle && (
            <span className="absolute left-2 top-3 z-10 -rotate-6 border border-black bg-white px-1.5 py-0.5 text-xs font-medium uppercase tracking-widest text-black">
              Best Value
            </span>
          )}
          {product.image ? (
            <img
              src={product.image.url}
              alt={product.image.altText ?? displayTitle}
              loading="eager"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
        <div className="mt-3 text-center md:mt-5 md:text-left">
          <div className="md:flex md:items-baseline md:justify-between md:gap-2">
            <h3 className="text-sm font-semibold md:text-base md:font-medium">
              <span className="md:hidden">{parts.name}</span>
              <span className="hidden md:inline">{displayTitle}</span>
            </h3>
            <div className="mt-1 hidden items-baseline gap-1.5 tabular-nums md:flex">
              {compareAt && parseFloat(compareAt.amount) > parseFloat(price.amount) ? (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(compareAt.amount, compareAt.currencyCode)}
                </span>
              ) : isBundle ? (
                <span className="text-sm text-muted-foreground line-through">$66.98</span>
              ) : null}
              <span className="text-base font-semibold">
                {formatPrice(price.amount, price.currencyCode)}
              </span>
            </div>
          </div>
          {parts.size && <p className="text-xs text-muted-foreground md:hidden">{parts.size}</p>}
          {isBundle && (
            <p className="mt-0.5 hidden text-xs font-medium text-muted-foreground md:block">You save $17.98 vs. buying separately</p>
          )}
          <div className="mt-2 hidden md:block" aria-label="Customer rating">
            <div
              className="jdgm-widget jdgm-preview-badge"
              data-id={product.id.split("/").pop() ?? ""}
            ></div>
          </div>
          <p className="mt-1 line-clamp-2 hidden text-sm text-muted-foreground md:block">
            {tagline}
          </p>
        </div>
      </a>

      {hasVariants ? (
        <a
          href={`/products/${product.handle}`}
          className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-black bg-white px-3 py-2 text-xs font-medium transition-colors hover:bg-neutral-100 md:mt-auto md:px-4 md:py-2.5 md:text-sm"
        >
          View sizes →
        </a>
      ) : hasSubscription && firstPlanPrice ? (
        <div className="mt-auto pt-4 flex flex-col gap-2">
          {/* One-time button — always visible */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut || !isHydrated}
            aria-label={justAdded ? `${displayTitle} added to cart` : `Add ${displayTitle} to cart for ${formatPrice(price.amount, price.currencyCode)}`}
            className="flex w-full items-center justify-between rounded-full border border-black bg-white px-3 py-2 text-xs font-medium transition-colors hover:bg-neutral-100 disabled:opacity-50 md:px-5 md:py-2.5 md:text-sm"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-xs">{justAdded ? "✓" : "↗"}</span> {justAdded ? "Added" : "One time"}
            </span>
            <span className="font-semibold">{formatPrice(price.amount, price.currencyCode)}</span>
          </button>

          {/* Subscribe button — opens frequency picker */}
          {!showFrequency ? (
            <div>
              <button
                type="button"
                onClick={() => setShowFrequency(true)}
                disabled={!isHydrated}
                className="flex w-full items-center justify-between rounded-full border border-black bg-white px-3 py-2 text-xs font-medium transition-colors hover:bg-neutral-100 md:px-5 md:py-2.5 md:text-sm"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-xs">↗</span> Subscribe
                </span>
                <span className="font-semibold">{firstPlanPrice}</span>
              </button>
              <p className="text-center text-xs text-muted-foreground mt-1.5">Pause or cancel anytime</p>
            </div>
          ) : (
            /* Frequency picker — expands in place */
            <div className="flex flex-col gap-2 rounded-2xl border border-neutral-300 bg-white p-3">
              <p className="text-xs font-medium text-foreground/60 uppercase tracking-wide">Delivery frequency</p>
              <div className="flex gap-2 flex-wrap">
                {allPlans.map((plan) => (
                  <button
                    type="button"
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`flex-1 min-w-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                      selectedPlanId === plan.id
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background border-input hover:border-foreground"
                    }`}
                  >
                    {shortLabel(plan.name)}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>{selectedPlan?.name}</span>
              </div>
              <button
                type="button"
                onClick={handleSubscribeConfirm}
                className="w-full rounded-full bg-foreground text-background py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Subscribe for {selectedPlanPrice}
              </button>
              <button
                type="button"
                onClick={() => setShowFrequency(false)}
                className="text-xs text-muted-foreground hover:text-foreground text-center transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="mt-3 w-full rounded-full border border-black bg-white px-3 py-2 text-xs font-medium transition-colors hover:bg-neutral-100 disabled:opacity-50 md:mt-auto md:px-5 md:py-2.5 md:text-sm"
          disabled={soldOut}
          onClick={handleAdd}
        >
          {soldOut ? "Sold out" : "Add to cart"}
        </button>
      )}
    </article>
  );
}
