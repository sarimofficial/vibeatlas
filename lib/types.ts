export type Slot = "coffee" | "afternoon" | "dining" | "movie" | "music";

export interface Contributor {
  name: string;
  score: number;
}

export interface Pick {
  slot: Slot;
  id: string;
  name: string;
  affinity: number;
  tags: string[];
  why: string;
  contributors: Contributor[];
  /** How this pick was sourced, e.g. "Qloo Insights (urn:entity:place)" or "DEMO DATA". */
  evidence: string;
}

export interface Step {
  title: string;
  detail: string;
  status: "done" | "skipped" | "active";
}

export interface Resolved {
  input: string;
  id: string | null;
  name: string | null;
}

export interface TasteProfile {
  anchors: string[];
  tags: string[];
  connections: string[];
}

export interface PlanResponse {
  mode: "live" | "demo";
  coherence: number;
  picks: Pick[];
  missingSlots: Slot[];
  steps: Step[];
  resolved: Resolved[];
  unresolved: string[];
  tasteProfile: TasteProfile;
  note: string;
  surprise: boolean;
}

export interface PlanRequest {
  likes: string[];
  city?: string;
  budget?: string;
  timeAvailable?: string;
  avoid?: string[];
  excluded?: string[];
  /** Previous picks to keep when replacing a single slot. */
  keep?: Pick[];
  replaceSlot?: Slot;
  surprise?: boolean;
}

export const SLOT_META: Record<
  Slot,
  { time: string; label: string; icon: string }
> = {
  coffee: { time: "09:00", label: "Morning coffee & quiet start", icon: "☕" },
  afternoon: { time: "13:00", label: "Afternoon discovery", icon: "🗺️" },
  dining: { time: "19:00", label: "Evening dining", icon: "🍽️" },
  movie: { time: "21:30", label: "Night film", icon: "🎬" },
  music: { time: "23:00", label: "Late music wind-down", icon: "🎵" },
};

export const ALL_SLOTS: Slot[] = [
  "coffee",
  "afternoon",
  "dining",
  "movie",
  "music",
];
