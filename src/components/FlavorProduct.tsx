import { useEffect, useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/cart-store";
import { withLifestyleFirst, type FlavorPageModel, type FlavorSizeOption } from "@/lib/flavors";
import { shopifyNumericId, trackMetaEvent } from "@/lib/meta";
import type { ProductImage, SellingPlan } from "@/lib/shopify";
import { formatPrice } from "@/lib/utils";

/**
 * Condensed flavor page. The heading is the shared family name.
 * The line under it is the selected flavor and jar size.
 * Size changes swap the Shopify product in place. Flavor tiles navigate.
 */
export default function FlavorProduct({ model }: { model: FlavorPageModel }) {
  const { heading, flavorName, sizes, tiles, review, shortCopy, moreCopy } = model;
  const initial = sizes.find((size) => size.servings === model.initialServings) ?? sizes[0];
  const [servings, setServings] = useState<10 | 20>(initial?.servings ?? 10);
  const [expanded, setExpanded] = useState(false);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const initialPlans = plansFor(initial);
  const [purchaseType, setPurchaseType] = useState<"one-time" | "subscribe">(
    initialPlans.length > 0 ? "subscribe" : "one-time",
  );
  const [planId, setPlanId] = useState(initialPlans[0]?.id ?? "");

  const selected = sizes.find((size) => size.servings === servings) ?? sizes[0];

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("size");
    if (requested !== "10" && requested !== "20") return;
    const next = Number(requested) as 10 | 20;
    if (!sizes.some((size) => size.servings === next) || next === servings) return;
    setServings(next);
    trackSize(sizes, flavorName, next);
    // Apply a shared link such as ?size=20 once, after the page has painted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    const nextPlans = plansFor(selected);
    setPurchaseType(nextPlans.length > 0 ? "subscribe" : "one-time");
    setPlanId(nextPlans[0]?.id ?? "");
    setQuantity(1);
  }, [selected?.product.id]);

  useEffect(() => {
    if (!ingredientsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIngredientsOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [ingredientsOpen]);

  if (!selected) return null;

  const plans = plansFor(selected);
  const hasSubscription = plans.length > 0;
  const variant = selected.product.variants.find((item) => item.availableForSale) ?? selected.product.variants[0];
  const soldOut = !variant?.availableForSale;
  const unit = variant ? parseFloat(variant.price.amount) : parseFloat(selected.product.priceRange.minVariantPrice.amount);
  const currency = variant?.price.currencyCode ?? selected.product.priceRange.minVariantPrice.currencyCode;
  const selectedPlan = plans.find((plan) => plan.id === planId) ?? plans[0];
  const subscribeAmount = selectedPlan ? discounted(selectedPlan, unit) : null;
  const subtitle = `${flavorName}, ${selected.label}`;
  const images = galleryImages(selected);

  function chooseSize(next: 10 | 20) {
    if (!sizes.some((size) => size.servings === next)) return;
    setServings(next);
    const url = new URL(window.location.href);
    url.searchParams.set("size", String(next));
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    trackSize(sizes, flavorName, next);
  }

  function handleAdd() {
    if (!variant || soldOut) return;
    const subscribing = purchaseType === "subscribe" && selectedPlan;
    addToCart(
      {
        variantId: variant.id,
        productId: selected.product.id,
        title: flavorName,
        variantTitle: selected.label,
        price: unit,
        currencyCode: currency,
        imageUrl: images[0]?.url ?? null,
        sellingPlanId: subscribing ? selectedPlan.id : undefined,
        sellingPlanName: subscribing ? selectedPlan.name : undefined,
        availablePlans: plans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          discountPct: discountPercent(plan),
        })),
      },
      quantity,
    );
  }

  return (
    <div className="grid min-w-0 items-start gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] lg:gap-12" data-serving={selected.servings} data-flavor={flavorName}>
      <Gallery key={`${selected.product.id}-${images[0]?.url ?? "none"}`} images={images} label={subtitle} />

      <div className="min-w-0 space-y-5">
        <ReviewSummary review={review} />

        <div>
          <h1 className="font-serif text-3xl tracking-tight md:text-4xl">{heading}</h1>
          <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Flavor</p>
          <p className="mt-1 font-serif text-4xl italic leading-none tracking-tight md:text-5xl">{flavorName}</p>
        </div>

        {(shortCopy || moreCopy) && (
          <div>
            <p className={`text-base leading-relaxed text-foreground/75 ${expanded ? "" : "line-clamp-2"}`}>
              {expanded && moreCopy ? `${shortCopy} ${moreCopy}` : shortCopy}
            </p>
            {moreCopy && (
              <button
                type="button"
                className="mt-1 text-sm font-medium underline underline-offset-4"
                aria-expanded={expanded}
                onClick={() => setExpanded((open) => !open)}
              >
                {expanded ? "Read less" : "Read more"}
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          className="text-sm font-medium underline underline-offset-4"
          onClick={() => setIngredientsOpen(true)}
        >
          View Ingredients
        </button>

        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Jar size">
          {sizes.map((size) => {
            const active = size.servings === selected.servings;
            const price = size.product.variants[0]?.price ?? size.product.priceRange.minVariantPrice;
            return (
              <a
                key={size.servings}
                href={`/products/${size.product.handle}`}
                role="radio"
                aria-checked={active}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  chooseSize(size.servings);
                }}
                className={`relative flex flex-col justify-center rounded-md bg-white px-3 py-3 text-left transition-colors ${
                  active ? "border-2 border-black" : "border border-neutral-300 hover:border-black"
                }`}
              >
                <span className="text-sm font-medium">{size.label}</span>
                <span className="mt-1 text-2xl font-medium">{formatPrice(price.amount, price.currencyCode)}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {size.servings === 20 ? "20 to 40 drinks" : "10 to 20 drinks"}
                </span>
              </a>
            );
          })}
        </div>

        <div>
          <h2 className="font-serif text-lg tracking-tight">Dose it your way</h2>
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            <li className="flex items-center gap-2.5">
              <ScoopMark className="h-12 w-auto shrink-0" />
              <p className="min-w-0 leading-tight">
                <span className="font-serif text-2xl leading-none">1</span>
                <span className="ml-1 text-sm">scoop</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Light day</span>
              </p>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="relative h-16 w-[6.8rem] shrink-0" aria-hidden="true">
                <ScoopMark className="absolute left-0 top-0 h-12 w-auto" />
                <ScoopMark className="absolute left-7 top-3.5 h-12 w-auto" />
              </span>
              <p className="min-w-0 leading-tight">
                <span className="font-serif text-2xl leading-none">2</span>
                <span className="ml-1 text-sm">scoops</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Hard training day</span>
              </p>
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-7 w-7" />
              <p className="min-w-0 leading-tight">
                <span className="font-serif text-2xl leading-none">0</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">wasted product</span>
              </p>
            </li>
          </ul>
        </div>

        <ul className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:pb-0">
          {tiles.map((tile) => {
            const href = servings === 20 && tile.handle20 ? `/products/${tile.handle20}` : `/products/${tile.handle10}`;
            const image = servings === 20 ? tile.image20 ?? tile.image10 : tile.image10 ?? tile.image20;
            return (
              <li key={tile.name} className="w-52 shrink-0 snap-start lg:w-auto">
                <a href={href} aria-current={tile.current ? "true" : undefined} className="group block text-center">
                  <span
                    className={`relative block aspect-square overflow-hidden rounded-lg bg-white p-6 ${
                      tile.current ? "ring-2 ring-black" : "ring-1 ring-black"
                    }`}
                  >
                    {image ? (
                      <img src={image} alt="" className="h-full w-full origin-center scale-[1.15] object-contain" />
                    ) : (
                      <span className="block h-full w-full" />
                    )}
                  </span>
                  {tile.badge && (
                    <span className="mt-4 block font-serif text-sm italic text-foreground/60">{tile.badge}</span>
                  )}
                  <span className={`${tile.badge ? "mt-1" : "mt-4"} block font-serif text-base tracking-tight`}>
                    {tile.name}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        {hasSubscription && (
          <div className="overflow-hidden rounded-xl border border-neutral-300 bg-white">
            <button
              type="button"
              onClick={() => setPurchaseType("one-time")}
              className={`flex w-full items-center gap-3 border-b border-neutral-300 bg-white px-4 py-3 text-left ${
                purchaseType === "one-time" ? "bg-neutral-100" : "hover:bg-neutral-100"
              }`}
            >
              <RadioMark selected={purchaseType === "one-time"} />
              <span className="flex-1 text-sm font-medium">One time purchase</span>
              <span className="text-sm font-medium">{formatPrice(unit, currency)}</span>
            </button>
            <button
              type="button"
              onClick={() => setPurchaseType("subscribe")}
              className={`flex w-full items-center gap-3 bg-white px-4 py-3 text-left ${
                purchaseType === "subscribe" ? "bg-neutral-100" : "hover:bg-neutral-100"
              }`}
            >
              <RadioMark selected={purchaseType === "subscribe"} />
              <span className="flex-1">
                <span className="block text-sm font-medium">Subscribe and save</span>
                {purchaseType === "subscribe" && selectedPlan && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">{selectedPlan.name}</span>
                )}
              </span>
              <span className="text-right text-sm font-medium">
                {subscribeAmount !== null ? formatPrice(subscribeAmount, currency) : formatPrice(unit, currency)}
              </span>
            </button>
            {purchaseType === "subscribe" && plans.length > 1 && (
              <div className="border-t border-neutral-300 bg-white px-4 py-3">
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="delivery-frequency">
                  Deliver every
                </label>
                <select
                  id="delivery-frequency"
                  value={planId}
                  onChange={(event) => setPlanId(event.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-neutral-300 bg-white">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="inline-flex h-12 w-10 items-center justify-center"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="inline-flex h-12 w-10 items-center justify-center"
              onClick={() => setQuantity((value) => value + 1)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button size="lg" className="h-14 flex-1 rounded-full text-base" disabled={soldOut} onClick={handleAdd}>
            {soldOut ? "Sold out" : purchaseType === "subscribe" && hasSubscription ? "Subscribe and save" : "Add to cart"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Satisfaction guaranteed</span>
          <span>Free shipping over $39</span>
        </div>
      </div>

      {ingredientsOpen && (
        <IngredientsDialog size={selected} flavorName={flavorName} onClose={() => setIngredientsOpen(false)} />
      )}
    </div>
  );
}

function ScoopMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 78 48" className={className} aria-hidden="true">
      <path d="M46 21.5h26.5a1.6 1.6 0 0 1 1.6 1.6v2.8a1.6 1.6 0 0 1-1.6 1.6H46" fill="currentColor" />
      <circle cx="68.5" cy="24.5" r="1.15" fill="#fff" />
      <path d="M14 23c0 11.5 6.2 19 16 19s16-7.5 16-19" fill="#fff" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="30" cy="23" rx="16" ry="6.2" fill="#fff" stroke="currentColor" strokeWidth="2" />
      <path d="M20 22.2c.6-8 5.2-12.2 10-12.2s9.4 4.2 10 12.2" fill="#fff" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <g fill="currentColor">
        <circle cx="26" cy="16.2" r="0.85" />
        <circle cx="30" cy="14.4" r="0.85" />
        <circle cx="34" cy="16" r="0.85" />
        <circle cx="28.2" cy="18.4" r="0.7" />
        <circle cx="32.4" cy="18.2" r="0.7" />
        <circle cx="30.2" cy="16.8" r="0.65" />
      </g>
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="16" cy="16" r="11" />
      <path d="M10.5 16.5 14 20l7.5-8" />
    </svg>
  );
}

function plansFor(size: FlavorSizeOption | undefined): SellingPlan[] {
  return (size?.product.sellingPlanGroups ?? []).flatMap((group) => group.sellingPlans);
}

function galleryImages(size: FlavorSizeOption): ProductImage[] {
  const images = size.product.images.length > 0 ? size.product.images : size.product.image ? [size.product.image] : [];
  return withLifestyleFirst(images);
}

function discountPercent(plan: SellingPlan): number {
  const adjustment = plan.priceAdjustments?.[0]?.adjustmentValue as { adjustmentPercentage?: number } | undefined;
  return adjustment?.adjustmentPercentage ?? 0;
}

function discounted(plan: SellingPlan, amount: number): number | null {
  const adjustment = plan.priceAdjustments?.[0]?.adjustmentValue as
    | { adjustmentPercentage?: number; adjustmentAmount?: { amount: string }; price?: { amount: string } }
    | undefined;
  if (!adjustment || !Number.isFinite(amount)) return null;
  if (adjustment.adjustmentPercentage) return amount * (1 - adjustment.adjustmentPercentage / 100);
  if (adjustment.adjustmentAmount?.amount) return amount - parseFloat(adjustment.adjustmentAmount.amount);
  if (adjustment.price?.amount) return parseFloat(adjustment.price.amount);
  return null;
}

function trackSize(sizes: FlavorSizeOption[], flavorName: string, servings: 10 | 20) {
  const size = sizes.find((item) => item.servings === servings);
  const variant = size?.product.variants.find((item) => item.availableForSale) ?? size?.product.variants[0];
  if (!size || !variant) return;
  const price = Number(parseFloat(variant.price.amount).toFixed(2));
  void trackMetaEvent("ViewContent", {
    content_ids: [shopifyNumericId(variant.id)],
    content_type: "product",
    content_name: flavorName,
    contents: [{ id: shopifyNumericId(variant.id), quantity: 1, item_price: price }],
    currency: variant.price.currencyCode || "USD",
    value: price,
  });
}

function RadioMark({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
        selected ? "border-foreground" : "border-muted-foreground"
      }`}
      aria-hidden="true"
    >
      {selected && <span className="block h-2 w-2 rounded-full bg-foreground" />}
    </span>
  );
}

/**
 * Stars and the count come from Judge.me. When that source has no reviews,
 * this renders nothing. It never invents a number.
 */
function ReviewSummary({ review }: { review: FlavorPageModel["review"] }) {
  if (!review || review.count <= 0) return null;
  const shown = Number.isInteger(review.average) ? String(review.average) : review.average.toFixed(1);
  const noun = review.count === 1 ? "review" : "reviews";
  return (
    <p className="flex items-center gap-2" aria-label={`${shown} out of 5 stars from ${review.count} ${noun}`}>
      <Stars value={review.average} />
      <span className="text-sm font-medium">
        {review.count} {noun}
      </span>
    </p>
  );
}

function Stars({ value }: { value: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <span className="inline-flex text-foreground" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => {
        const amount = Math.min(1, Math.max(0, value - index));
        return <StarIcon key={index} amount={amount} gradientId={`${id}-${index}`} />;
      })}
    </span>
  );
}

function StarIcon({ amount, gradientId }: { amount: number; gradientId: string }) {
  const point = "M10 1.7 12.2 7.1l5.8.5-4.4 3.8 1.4 5.6L10 14.2 4.9 17l1.4-5.6L1.9 7.6l5.8-.5L10 1.7Z";
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
          <stop offset={`${amount * 100}%`} stopColor="currentColor" />
          <stop offset={`${amount * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={point} fill={`url(#${gradientId})`} stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function Gallery({ images, label }: { images: ProductImage[]; label: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const count = images.length;
  const safeIndex = count === 0 ? 0 : index % count;

  function show(next: number) {
    if (count === 0) return;
    setIndex((next + count) % count);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") show(safeIndex - 1);
      if (event.key === "ArrowRight") show(safeIndex + 1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, safeIndex, count]);

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-white text-sm text-muted-foreground ring-1 ring-black">
        No image
      </div>
    );
  }

  const current = images[safeIndex];

  return (
    <div className="min-w-0 space-y-3 lg:sticky lg:top-20 lg:z-10 lg:self-start">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-white lg:aspect-auto lg:h-[calc(100dvh-16.5rem)]">
        <button
          type="button"
          className="block h-full w-full cursor-zoom-in"
          aria-label={`View larger image of ${label}`}
          onClick={() => setOpen(true)}
        >
          <img
            src={current.url}
            alt={current.altText || label}
            className="h-full w-full object-contain p-3"
            draggable={false}
          />
        </button>
        {count > 1 && (
          <>
            <button
              type="button"
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl shadow"
              aria-label="Previous product image"
              onClick={() => show(safeIndex - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl shadow"
              aria-label="Next product image"
              onClick={() => show(safeIndex + 1)}
            >
              ›
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {images.map((image, imageIndex) => (
            <button
              key={`${image.url}-${imageIndex}`}
              type="button"
              aria-label={`Show image ${imageIndex + 1}`}
              aria-current={imageIndex === safeIndex}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 bg-white md:h-20 md:w-20 ${
                imageIndex === safeIndex ? "border-foreground" : "border-transparent"
              }`}
              onClick={() => setIndex(imageIndex)}
            >
              <img src={image.url} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="Product image viewer"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <button
            type="button"
            className="absolute right-3 top-3 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-white"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
          {count > 1 && (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-2xl text-white"
                aria-label="Previous"
                onClick={() => show(safeIndex - 1)}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-2xl text-white"
                aria-label="Next"
                onClick={() => show(safeIndex + 1)}
              >
                ›
              </button>
            </>
          )}
          <img
            src={current.url}
            alt={current.altText || label}
            className="max-h-[calc(100dvh-7rem)] max-w-[100vw] object-contain"
          />
        </div>
      )}
    </div>
  );
}

function IngredientsDialog({
  size,
  flavorName,
  onClose,
}: {
  size: FlavorSizeOption;
  flavorName: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Ingredients for ${flavorName}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-2xl">Ingredients</h2>
          <button type="button" className="text-sm font-medium underline underline-offset-4" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{flavorName}, {size.label}</p>
        {size.ingredientText && <p className="mt-4 text-sm leading-relaxed">{size.ingredientText}</p>}
        {size.citricNote && <p className="mt-3 text-sm leading-relaxed text-foreground/75">{size.citricNote}</p>}
        {size.labelImages.length > 0 && (
          <div className="mt-4 space-y-4">
            {size.labelImages.map((image) => (
              <img
                key={image.url}
                src={image.url}
                alt={image.altText || `${flavorName} ingredients and nutrition`}
                className="w-full bg-white object-contain"
              />
            ))}
          </div>
        )}
        {!size.ingredientText && size.labelImages.length === 0 && (
          <p className="mt-4 text-sm leading-relaxed">Ingredients and nutrition facts are printed on the jar.</p>
        )}
      </div>
    </div>
  );
}
