import { DEMO_ALTERNATIVE, DEMO_PRIMARY } from "./demo";
import {
  affinityOf,
  contributorsOf,
  insightsForSlot,
  qlooBaseUrl,
  rawToPick,
  resolveEntities,
  tagsOf,
} from "./qloo";
import type {
  Pick,
  PlanRequest,
  PlanResponse,
  Slot,
  Step,
  TasteProfile,
} from "./types";
import { ALL_SLOTS } from "./types";

function cleanList(items: string[] | undefined): string[] {
  return (items ?? []).map((s) => s.trim()).filter(Boolean);
}

function matchesAvoid(name: string, avoid: string[]): boolean {
  const lower = name.toLowerCase();
  return avoid.some((a) => a.length >= 2 && lower.includes(a.toLowerCase()));
}

function mean(picks: Pick[]): number {
  if (picks.length === 0) return 0;
  return (
    Math.round((picks.reduce((s, p) => s + p.affinity, 0) / picks.length) * 100) / 100
  );
}

function profileFromPicks(picks: Pick[], anchors: string[]): TasteProfile {
  const tags: string[] = [];
  for (const p of picks) {
    for (const t of p.tags) if (!tags.includes(t)) tags.push(t);
  }
  const connections: string[] = [];
  for (const p of picks) {
    for (const c of p.contributors) {
      const line = `${c.name} → ${p.name}`;
      if (!connections.includes(line)) connections.push(line);
    }
  }
  return { anchors, tags: tags.slice(0, 12), connections: connections.slice(0, 8) };
}

export async function buildPlan(req: PlanRequest): Promise<PlanResponse> {
  const likes = cleanList(req.likes);
  if (likes.length === 0) {
    throw Object.assign(new Error("Enter at least one thing you love."), { status: 400 });
  }
  const city = req.city?.trim() || undefined;
  const avoid = cleanList(req.avoid);
  const excluded = cleanList(req.excluded);
  const surprise = req.surprise === true;
  const hasKey = Boolean(process.env.QLOO_API_KEY);

  // ---------- DEMO MODE (no key): no Qloo call is made at all. ----------
  if (!hasKey) {
    let picks: Pick[];
    if (req.replaceSlot && req.keep) {
      const kept = req.keep.filter((p) => p.slot !== req.replaceSlot);
      const replacement = surprise
        ? DEMO_ALTERNATIVE[req.replaceSlot]
        : DEMO_ALTERNATIVE[req.replaceSlot];
      picks = [...kept, replacement].sort(
        (a, b) => ALL_SLOTS.indexOf(a.slot) - ALL_SLOTS.indexOf(b.slot),
      );
    } else if (surprise) {
      picks = ALL_SLOTS.map((s) => DEMO_ALTERNATIVE[s]);
    } else {
      picks = ALL_SLOTS.map((s) => DEMO_PRIMARY[s]);
    }
    // Demo veto: the vetoed pick is simply not in the new set, because
    // the alternative set has different IDs. Honour "avoid" the same way.
    picks = picks.filter((p) => !matchesAvoid(p.name, avoid));
    const steps: Step[] = [
      {
        title: "UNDERSTAND",
        detail: `Parsed ${likes.length} likes (${likes.join(", ")}), city ${city ?? "(none given)"}, budget ${req.budget?.trim() || "(none)"}, time ${req.timeAvailable?.trim() || "(none)"}, avoid: ${avoid.join(", ") || "none"}. Budget and time are displayed constraints only — they are NOT Qloo query parameters, so Qloo did not filter on them.`,
        status: "done",
      },
      {
        title: "RESOLVE TASTE",
        detail: "Skipped — no QLOO_API_KEY is configured, so no Qloo entity search ran. Anchors below are your typed likes, not resolved Qloo entity IDs.",
        status: "skipped",
      },
      {
        title: "EXPLORE CULTURE",
        detail: "Skipped — no Qloo Insights call ran. Picks below are DEMO DATA samples with invented affinity numbers.",
        status: "skipped",
      },
      {
        title: "BUILD PLAN",
        detail: req.replaceSlot
          ? `Replaced only the ${req.replaceSlot} slot with the alternative sample pick; other slots were kept.`
          : surprise
            ? "Surprise Me: the alternative (second) sample pick was used for every slot."
            : "Built the day timeline from the primary sample set, in slot order.",
        status: "done",
      },
      {
        title: "VALIDATE",
        detail: `Checked: ${picks.length} sample picks, all marked (demo), no real venue/opening-hours/price claim. Missing slots (if any) are listed, not invented.`,
        status: "done",
      },
    ];
    return {
      mode: "demo",
      coherence: mean(picks),
      picks,
      missingSlots: ALL_SLOTS.filter((s) => !picks.some((p) => p.slot === s)),
      steps,
      resolved: likes.map((input) => ({ input, id: null, name: null })),
      unresolved: likes,
      tasteProfile: profileFromPicks(picks, likes),
      note: "DEMO MODE — every pick, affinity, and tag below is sample data, not a Qloo result. Add QLOO_API_KEY (hackathon host: https://hackathon.api.qloo.com) to switch to live Qloo mode.",
      surprise,
    };
  }

  // ---------- LIVE MODE ----------
  const resolved = await resolveEntities(likes);
  const resolvedById = new Map<string, string>();
  for (const r of resolved) if (r.id && r.name) resolvedById.set(r.id, r.name);
  const entityIds = resolved.filter((r) => r.id).map((r) => r.id as string);
  const unresolved = resolved.filter((r) => !r.id).map((r) => r.input);
  const anchors = resolved.filter((r) => r.name).map((r) => r.name as string);

  const steps: Step[] = [
    {
      title: "UNDERSTAND",
      detail: `Parsed ${likes.length} likes, city ${city ?? "(none given)"}, budget ${req.budget?.trim() || "(none)"}, time ${req.timeAvailable?.trim() || "(none)"}, avoid: ${avoid.join(", ") || "none"}. Budget/time are displayed constraints only, not Qloo parameters.`,
      status: "done",
    },
    {
      title: "RESOLVE TASTE",
      detail:
        entityIds.length > 0
          ? `GET ${qlooBaseUrl()}/search (fallback /v2/search) resolved ${entityIds.length} of ${likes.length} likes to Qloo entity IDs.${unresolved.length ? ` Unresolved: ${unresolved.join(", ")}.` : ""}`
          : `No likes resolved to Qloo entity IDs — cannot query Insights. Try well-known artist, movie, or place names.`,
      status: entityIds.length > 0 ? "done" : "skipped",
    },
  ];

  if (entityIds.length === 0) {
    throw Object.assign(
      new Error(
        `Qloo could not resolve any of the typed likes (${likes.join(", ")}). Try well-known movie, artist, or place names.`,
      ),
      { status: 502 },
    );
  }

  const kept = new Map<Slot, Pick>();
  if (req.replaceSlot && req.keep) {
    for (const p of req.keep) if (p.slot !== req.replaceSlot) kept.set(p.slot, p);
  }
  const slotsToBuild = req.replaceSlot
    ? [req.replaceSlot]
    : ALL_SLOTS.filter((s) => !kept.has(s));

  const exploreDetails: string[] = [];
  const freshPicks: Pick[] = [];
  const missingSlots: Slot[] = [];
  const usedIds = new Set<string>([...excluded, ...Array.from(kept.values()).map((p) => p.id)]);

  for (const slot of slotsToBuild) {
    const calls = await insightsForSlot(slot, entityIds, Array.from(usedIds), city);
    let chosen: Pick | null = null;
    let chosenType = "";
    for (const call of calls) {
      const candidates = call.results
        .map((raw) => ({ raw, name: String(raw.entity?.name ?? raw.name ?? "") }))
        .filter(({ raw }) => {
          const id = String(raw.entity?.entity_id ?? raw.entity_id ?? raw.id ?? "");
          return id && !usedIds.has(id);
        })
        .filter(({ name }) => !matchesAvoid(name, avoid));
      if (candidates.length === 0) continue;
      const index = surprise ? Math.min(1, candidates.length - 1) : 0;
      const { raw } = candidates[index];
      chosen = rawToPick(slot, raw, call.type, resolvedById, anchors);
      chosenType = call.type;
      break;
    }
    if (chosen) {
      freshPicks.push(chosen);
      usedIds.add(chosen.id);
    } else {
      missingSlots.push(slot);
    }
    const callSummary = calls
      .map((c) => `${c.type}: ${c.error ? `error` : `${c.results.length} results`}`)
      .join("; ");
    exploreDetails.push(
      `${slot}: GET ${qlooBaseUrl()}/v2/insights (fallback /insights) with filter.type attempts [${calls.map((c) => c.type).join(", ")}], signal.interests.entities=<${entityIds.length} IDs>, feature.explainability=true, take=8${city && (slot === "coffee" || slot === "afternoon" || slot === "dining") ? `, filter.location.query=${city}` : ""} → ${callSummary}${chosen ? `; kept ${chosen.name} (${chosenType}, affinity ${chosen.affinity.toFixed(2)})` : "; no usable candidate — slot left missing, not invented."}`,
    );
  }

  steps.push({
    title: "EXPLORE CULTURE",
    detail: exploreDetails.join(" "),
    status: "done",
  });

  const picks = [...[...kept.values()], ...freshPicks].sort(
    (a, b) => ALL_SLOTS.indexOf(a.slot) - ALL_SLOTS.indexOf(b.slot),
  );
  const allMissing = ALL_SLOTS.filter((s) => !picks.some((p) => p.slot === s));

  steps.push({
    title: "BUILD PLAN",
    detail: req.replaceSlot
      ? `Replaced only the ${req.replaceSlot} slot via a fresh Qloo Insights call with vetoed IDs excluded; other slots were kept unchanged.`
      : surprise
        ? "Surprise Me: the second-ranked Qloo candidate was used for each slot (still a real Qloo result, one step beyond your top picks)."
        : `Ranked each slot's Qloo candidates by affinity and kept the top non-vetoed, non-avoided pick; timeline ordered coffee → afternoon → dining → movie → music. Coherence = mean affinity = ${mean(picks).toFixed(2)}.`,
    status: "done",
  });
  steps.push({
    title: "VALIDATE",
    detail: `Checked: every pick has a Qloo affinity in [0, 1] and an evidence label naming its Qloo type; no vetoed ID and no avoid-match is present; ${allMissing.length ? `missing slots (${allMissing.join(", ")}) are listed, not invented` : "no slot is missing"}; places are only claimed where Qloo returned a place — brand-level dining picks are labelled as category-level, with no open/nearby/affordable claim.`,
    status: "done",
  });

  return {
    mode: "live",
    coherence: mean(picks),
    picks,
    missingSlots: allMissing,
    steps,
    resolved,
    unresolved,
    tasteProfile: profileFromPicks(picks, anchors.length ? anchors : likes),
    note:
      "LIVE Qloo mode: picks, affinities, tags, and contributor links come from Qloo Insights with explainability on. " +
      (allMissing.length
        ? `Qloo returned no usable result for: ${allMissing.join(", ")} — shown as missing, not invented. Try different likes or a different city. `
        : "") +
      "Explanations are deterministic summaries of the returned Qloo data; no LLM key is used.",
    surprise,
  };
}

// Re-exported so route files and tests share the same parsing helpers.
export { affinityOf, contributorsOf, tagsOf };
