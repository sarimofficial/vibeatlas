import type { Pick, Slot } from "./types";

/**
 * DEMO DATA — explicitly labelled samples, used ONLY when no QLOO_API_KEY
 * is configured. These names, affinities, and tags are invented for UI
 * testing. They are never live Qloo results and the UI marks every one
 * "(demo)" with a DEMO MODE banner. The first set is tuned to the plan
 * file's example (Frank Ocean, Interstellar, minimalist fashion,
 * specialty coffee, quiet places, Karachi); the alternative set is what
 * a veto / Surprise Me re-plan returns.
 */
function pick(
  slot: Slot,
  id: string,
  name: string,
  affinity: number,
  tags: string[],
  why: string,
): Pick {
  return {
    slot,
    id,
    name: `${name} (demo)`,
    affinity,
    tags,
    why: `DEMO DATA sample — ${why}`,
    contributors: [],
    evidence: "DEMO DATA (sample, not a Qloo result)",
  };
}

export const DEMO_PRIMARY: Record<Slot, Pick> = {
  coffee: pick(
    "coffee",
    "demo-coffee-1",
    "Quiet specialty coffee house",
    0.88,
    ["specialty coffee", "quiet", "minimalist"],
    "a calm, design-led start that matches the specialty-coffee and quiet-places anchors. In live mode this slot would be a real Qloo place result with its own affinity and explainability.",
  ),
  afternoon: pick(
    "afternoon",
    "demo-afternoon-1",
    "Minimalist gallery & design walk",
    0.85,
    ["minimalist", "design", "quiet"],
    "a slow, visual afternoon that echoes the minimalist-fashion anchor. In live mode this would come from a Qloo destination/place Insights call.",
  ),
  dining: pick(
    "dining",
    "demo-dining-1",
    "Quiet, understated restaurant (cuisine-level sample)",
    0.87,
    ["quiet", "understated", "seasonal"],
    "an evening meal that keeps the quiet, minimalist thread of the day. This demo pick is cuisine/atmosphere-level only — it does not claim a real venue, opening hours, or price.",
  ),
  movie: pick(
    "movie",
    "demo-movie-1",
    "Contemplative sci-fi film",
    0.91,
    ["sci-fi", "contemplative", "cinematic"],
    "a film in the same contemplative, cinematic space as the Interstellar anchor. In live mode the title, affinity, and contributors would come from Qloo Insights for urn:entity:movie.",
  ),
  music: pick(
    "music",
    "demo-music-1",
    "Soulful, atmospheric listening session",
    0.89,
    ["soul", "atmospheric", "late-night"],
    "a late-night sound that sits near the Frank Ocean anchor. In live mode this would be a Qloo artist result with affinity and explainability.",
  ),
};

export const DEMO_ALTERNATIVE: Record<Slot, Pick> = {
  coffee: pick(
    "coffee",
    "demo-coffee-2",
    "Second quiet coffee spot",
    0.82,
    ["specialty coffee", "quiet"],
    "the next sample coffee pick, returned after a veto or Surprise Me. Sample only — not a Qloo result.",
  ),
  afternoon: pick(
    "afternoon",
    "demo-afternoon-2",
    "Bookshop & quiet courtyard wander",
    0.8,
    ["books", "quiet", "wandering"],
    "the next sample afternoon pick, returned after a veto or Surprise Me. Sample only — not a Qloo result.",
  ),
  dining: pick(
    "dining",
    "demo-dining-2",
    "Second quiet dining sample",
    0.83,
    ["quiet", "seasonal"],
    "the next sample dining pick, returned after a veto or Surprise Me. Sample only — not a Qloo result, and not a claim about a real venue.",
  ),
  movie: pick(
    "movie",
    "demo-movie-2",
    "Second contemplative film sample",
    0.85,
    ["contemplative", "cinematic"],
    "the next sample film pick, returned after a veto or Surprise Me. Sample only — not a Qloo result.",
  ),
  music: pick(
    "music",
    "demo-music-2",
    "Second atmospheric listening sample",
    0.84,
    ["atmospheric", "soul"],
    "the next sample music pick, returned after a veto or Surprise Me. Sample only — not a Qloo result.",
  ),
};
