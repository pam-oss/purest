/**
 * Judge.me is the storefront's review source. The public token is the same
 * one Layout already loads for the review widget.
 *
 * A null summary means we have no count to show. Callers must render nothing.
 * Never substitute a made up rating or review count.
 */
import { shopifyNumericId } from "@/lib/meta";

const JUDGE_ME_SHOP = "6d47f8-3c.myshopify.com";
const JUDGE_ME_TOKEN = "RVolVt5dOmLGdFEmALNqeYeIRK0";

export interface ReviewSummary {
  average: number;
  count: number;
}

const cache = new Map<string, Promise<ReviewSummary | null>>();

export function getReviewSummary(productId: string, alsoProductIds: string[] = []): Promise<ReviewSummary | null> {
  const ids = [productId, ...alsoProductIds].filter((id, index, all) => all.indexOf(id) === index);
  return Promise.all(ids.map((id) => summaryFor(id))).then(combineSummaries);
}

function summaryFor(productId: string): Promise<ReviewSummary | null> {
  const externalId = shopifyNumericId(productId);
  if (!/^\d+$/.test(externalId)) return Promise.resolve(null);
  const existing = cache.get(externalId);
  if (existing) return existing;
  const pending = fetchSummary(externalId);
  cache.set(externalId, pending);
  return pending;
}

function combineSummaries(summaries: (ReviewSummary | null)[]): ReviewSummary | null {
  const rated = summaries.filter((summary): summary is ReviewSummary => summary !== null && summary.count > 0);
  if (rated.length === 0) return null;
  const count = rated.reduce((total, summary) => total + summary.count, 0);
  const average = rated.reduce((total, summary) => total + summary.average * summary.count, 0) / count;
  return { average, count };
}

async function fetchSummary(externalId: string): Promise<ReviewSummary | null> {
  try {
    const url = `https://judge.me/api/v1/widgets/preview_badge?api_token=${JUDGE_ME_TOKEN}&shop_domain=${JUDGE_ME_SHOP}&external_id=${externalId}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as { badge?: string };
    const badge = data.badge ?? "";
    const rating = badge.match(/data-average-rating='([0-9.]+)'/);
    const count = badge.match(/data-number-of-reviews='(\d+)'/);
    if (!rating || !count) return null;
    const reviews = Number(count[1]);
    const average = Number(rating[1]);
    if (!Number.isFinite(reviews) || reviews <= 0 || !Number.isFinite(average) || average <= 0) {
      return null;
    }
    return { average, count: reviews };
  } catch {
    return null;
  }
}
