import type { Pick, Resolved, Slot } from "./types";

/**
 * LIVE Qloo client — server-side only. Never import this from client code.
 *
 * Sources verified against the Qloo Agentic Hackathon Developer Guide
 * (docs.qloo.com/reference/qloo-llm-hackathon-developer-guide, updated
 * 2026-10-07) and the Insights API docs:
 *   - Hackathon API keys work ONLY against https://hackathon.api.qloo.com.
 *     They do NOT work against https://api.qloo.com (production) — using
 *     the production host with a hackathon key always returns 401.
 *     Default base below is therefore the hackathon host. If the key was
 *     issued for a different host, set QLOO_API_BASE_URL to that host.
 *   - Entity lookup: GET {base}/search?query=<name> (the guide says
 *     "/search", not "/v2/search"). Fallback /v2/search on 404 only.
 *   - Recommendations: GET {base}/v2/insights?... (GET, query string,
 *     never a POST body). Fallback /insights on 404 only.
 *   - Auth: X-Api-Key header. Do NOT use /recommendations or /recs
 *     (legacy, unsupported for the hackathon).
 *   - Affinity: results[].query.affinity, 0 to 1. Explainability:
 *     results[].query.explainability, per-recommendation input-entity
 *     contributions (normalised 0..1; >= 0.1 always included).
 *
 * If QLOO_API_KEY is missing, callers must use demo mode; this module
 * never fabricates a live result. If a key is present but Qloo errors,
 * callers return that error — they must NOT silently fall back to demo
 * data, because that would present samples as live Qloo results.
 */

export type EntityType =
  | "urn:entity:place"
  | "urn:entity:destination"
  | "urn:entity:brand"
  | "urn:entity:movie"
  | "urn:entity:artist";

/** Ordered attempts per slot. A later attempt is used only if the
 *  earlier one returns no usable candidate, and the pick is labelled
 *  with the type that actually returned it — never as a specific
 *  place when only a category/brand-level match came back. */
export const SLOT_ATTEMPTS: Record<Slot, EntityType[]> = {
  coffee: ["urn:entity:place"],
  afternoon: ["urn:entity:destination", "urn:entity:place"],
  dining: ["urn:entity:place", "urn:entity:brand"],
  movie: ["urn:entity:movie"],
  music: ["urn:entity:artist"],
};

function baseUrl(): string {
  return (process.env.QLOO_API_BASE_URL || "https://hackathon.api.qloo.com").replace(
    /\/$/,
    "",
  );
}

export function qlooBaseUrl(): string {
  return baseUrl();
}

function headers(): Record<string, string> {
  return {
    Accept: "application/json",
    "X-Api-Key": process.env.QLOO_API_KEY as string,
  };
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `Qloo request failed (${res.status}) for ${url.split("?")[0]}: ${text.slice(0, 300)}`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function getWithFallback(paths: string[]): Promise<unknown> {
  let last: unknown;
  for (const path of paths) {
    try {
      return await getJson(`${baseUrl()}${path}`);
    } catch (e) {
      const status = (e as { status?: number }).status;
      last = e;
      if (status !== 404) throw e;
    }
  }
  throw last;
}

function parseSearchResults(data: unknown): { id: string; name: string }[] {
  const root = data as Record<string, unknown>;
  const raw =
    (root?.results as Record<string, unknown> | undefined)?.entities ??
    root?.results ??
    root?.entities ??
    [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const e = r as Record<string, unknown>;
      const entity = (e.entity as Record<string, unknown> | undefined) ?? e;
      const id = String(entity.entity_id ?? entity.id ?? e.entity_id ?? e.id ?? "");
      const name = String(entity.name ?? e.name ?? "");
      return { id, name };
    })
    .filter((r) => r.id && r.name);
}

export async function resolveEntities(names: string[]): Promise<Resolved[]> {
  const out: Resolved[] = [];
  for (const name of names) {
    const q = encodeURIComponent(name.trim());
    try {
      const data = await getWithFallback([
        `/search?query=${q}`,
        `/v2/search?query=${q}`,
      ]);
      const first = parseSearchResults(data)[0];
      out.push({ input: name, id: first?.id ?? null, name: first?.name ?? null });
    } catch {
      out.push({ input: name, id: null, name: null });
    }
  }
  return out;
}

export interface RawInsight {
  entity?: { name?: string; entity_id?: string; tags?: unknown };
  name?: string;
  entity_id?: string;
  id?: string;
  tags?: unknown;
  query?: {
    affinity?: number;
    affinity_score?: number;
    explainability?: Record<string, unknown>;
  };
  affinity?: number;
}

function parseInsights(data: unknown): RawInsight[] {
  const root = data as Record<string, unknown>;
  const results = root?.results as unknown;
  if (Array.isArray(results)) return results as RawInsight[];
  if (results && typeof results === "object") {
    const r = results as Record<string, unknown>;
    if (Array.isArray(r.entities)) return r.entities as RawInsight[];
    if (Array.isArray(r.results)) return r.results as RawInsight[];
  }
  if (Array.isArray(root?.entities)) return root.entities as RawInsight[];
  return [];
}

export function affinityOf(r: RawInsight): number {
  const v = r.query?.affinity ?? r.query?.affinity_score ?? r.affinity ?? NaN;
  return Number.isFinite(v) ? Math.max(0, Math.min(1, Number(v))) : 0;
}

export function tagsOf(r: RawInsight): string[] {
  const raw = r.entity?.tags ?? r.tags ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => {
      if (typeof t === "string") return t;
      const o = t as Record<string, unknown>;
      return String(o.name ?? o.tag ?? "");
    })
    .filter(Boolean)
    .slice(0, 6);
}

export function contributorsOf(
  r: RawInsight,
  resolvedById: Map<string, string>,
): { name: string; score: number }[] {
  const exp = r.query?.explainability as Record<string, unknown> | undefined;
  if (!exp) return [];
  const entries: { id: string; score: number }[] = [];
  const list = (exp as { entities?: unknown }).entities;
  if (Array.isArray(list)) {
    for (const item of list) {
      const o = item as Record<string, unknown>;
      const id = String(o.entity_id ?? o.id ?? "");
      const score = Number(o.score ?? o.affinity ?? o.value ?? NaN);
      if (id && Number.isFinite(score)) entries.push({ id, score });
    }
  } else {
    for (const [id, score] of Object.entries(exp)) {
      if (typeof score === "number" && Number.isFinite(score)) {
        entries.push({ id, score });
      }
    }
  }
  return entries
    .filter((e) => e.score >= 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((e) => ({ name: resolvedById.get(e.id) ?? e.id, score: Math.round(e.score * 100) / 100 }));
}

export interface InsightCall {
  type: EntityType;
  results: RawInsight[];
  error?: string;
}

/** One Insights call per attempt type, in parallel for a slot. */
export async function insightsForSlot(
  slot: Slot,
  entityIds: string[],
  excluded: string[],
  city?: string,
): Promise<InsightCall[]> {
  const calls = SLOT_ATTEMPTS[slot].map(async (type): Promise<InsightCall> => {
    const params = new URLSearchParams({
      "filter.type": type,
      "signal.interests.entities": entityIds.join(","),
      "feature.explainability": "true",
      take: "8",
    });
    if (excluded.length > 0) params.set("filter.exclude.entities", excluded.join(","));
    // NOTE: filter.location.query is NOT in the Place/Destination supported
    // parameter lists (it belongs to heatmap queries) and Qloo silently
    // ignores unsupported parameters, so we do NOT send it. City is a
    // display constraint only, like budget/time, until a documented
    // place-location parameter is confirmed. Sending it previously could
    // not by itself explain empty results, but removing it removes one
    // unsupported parameter from every place/destination call.
    void city;
    try {
      const data = await getWithFallback([
        `/v2/insights?${params.toString()}`,
        `/insights?${params.toString()}`,
      ]);
      return { type, results: parseInsights(data) };
    } catch (e) {
      return { type, results: [], error: (e as Error).message.slice(0, 200) };
    }
  });
  return Promise.all(calls);
}

export function rawToPick(
  slot: Slot,
  raw: RawInsight,
  type: EntityType,
  resolvedById: Map<string, string>,
  anchors: string[],
): Pick {
  const id = String(raw.entity?.entity_id ?? raw.entity_id ?? raw.id ?? "");
  const name = String(raw.entity?.name ?? raw.name ?? "Unnamed pick");
  const affinity = affinityOf(raw);
  const contributors = contributorsOf(raw, resolvedById);
  const contributorText =
    contributors.length > 0
      ? ` Qloo explainability links it most to: ${contributors
          .map((c) => `${c.name} (${c.score})`)
          .join(", ")}.`
      : "";
  const typeNote =
    type === "urn:entity:brand"
      ? " This is a category/brand-level Qloo match, not a specific venue — Qloo returned no specific place for this slot, so no restaurant is claimed to be open, nearby, or affordable."
      : type === "urn:entity:place" && slot === "afternoon"
        ? " Qloo returned this as a place for the afternoon slot (no destination result was returned)."
        : "";
  return {
    slot,
    id,
    name,
    affinity: Math.round(affinity * 100) / 100,
    tags: tagsOf(raw),
    why:
      `Qloo affinity ${affinity.toFixed(2)} against your taste anchors (${anchors.join(", ")}) — ` +
      `a measured position in Qloo's taste graph, not an LLM guess. A high affinity means this pick sits close to the things you already love.${contributorText}${typeNote}`,
    contributors,
    evidence: `Qloo Insights (${type})`,
  };
}
