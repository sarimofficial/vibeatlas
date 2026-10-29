"use client";

import { useEffect, useRef, useState } from "react";
import type { PlanResponse, Slot } from "@/lib/types";
import { ALL_SLOTS, SLOT_META } from "@/lib/types";

const EXAMPLE = {
  likes:
    "Frank Ocean, Interstellar, minimalist fashion, specialty coffee, quiet places",
  city: "New York",
  budget: "Moderate",
  timeAvailable: "Full day",
  avoid: "",
};

const PRESETS = [
  { name: "Music lover day", likes: "Frank Ocean, Kendrick Lamar, jazz, vinyl records, late-night listening" },
  { name: "Film lover day", likes: "Interstellar, Christopher Nolan, sci-fi, cinema, film scores" },
  { name: "Foodie day", likes: "specialty coffee, sushi, street food, quiet restaurants, brunch" },
];

function splitList(text: string): string[] {
  return text
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function Home() {
  const [likes, setLikes] = useState("");
  const [city, setCity] = useState("New York");
  const [budget, setBudget] = useState("");
  const [timeAvailable, setTimeAvailable] = useState("");
  const [avoid, setAvoid] = useState("");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [savedDays, setSavedDays] = useState<{ city: string; budget: string; timeAvailable: string; plan: PlanResponse; savedAt: string }[]>([]);

  async function callPlan(body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Plan failed.");
      setPlan(data as PlanResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan failed.");
    } finally {
      setLoading(false);
    }
  }

  function baseBody() {
    return {
      likes: splitList(likes),
      city: city.trim() || undefined,
      budget: budget.trim() || undefined,
      timeAvailable: timeAvailable.trim() || undefined,
      avoid: splitList(avoid),
      excluded,
    };
  }

  function build() {
    void callPlan({ ...baseBody(), excluded: [] });
    setExcluded([]);
  }

  function veto(slot: Slot, id: string) {
    if (!plan) return;
    const nextExcluded = [...excluded, id];
    setExcluded(nextExcluded);
    void callPlan({
      ...baseBody(),
      excluded: nextExcluded,
      keep: plan.picks,
      replaceSlot: slot,
    });
  }

  function surprise() {
    void callPlan({ ...baseBody(), surprise: true });
  }

  function reset() {
    setPlan(null);
    setExcluded([]);
    setError(null);
  }

  function summaryLines(): string[] {
    if (!plan) return [];
    const lines = [
      `VibeAtlas day in ${city.trim() || "New York"} — coherence ${Math.round(plan.coherence * 100)}% (${plan.mode} mode)`,
      "",
    ];
    for (const slot of ALL_SLOTS) {
      const pick = plan.picks.find((p) => p.slot === slot);
      const meta = SLOT_META[slot];
      if (pick) {
        lines.push(`${meta.time} ${meta.label}: ${pick.name} (${pick.affinity.toFixed(2)})`);
        lines.push(`  Why: ${pick.why}`);
      } else {
        lines.push(`${meta.time} ${meta.label}: missing — not invented`);
      }
    }
    return lines;
  }

  const sharedLoaded = useRef(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("vibeatlas-saved-days");
      if (raw) setSavedDays(JSON.parse(raw));
    } catch {
      // Saved days are best-effort.
    }
  }, []);
  useEffect(() => {
    if (sharedLoaded.current) return;
    sharedLoaded.current = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedLikes = params.get("likes");
      if (!sharedLikes) return;
      const sharedCity = params.get("city") || "New York";
      const sharedBudget = params.get("budget") || "";
      const sharedTime = params.get("time") || "";
      setLikes(sharedLikes);
      setCity(sharedCity);
      setBudget(sharedBudget);
      setTimeAvailable(sharedTime);
      void callPlan({
        likes: splitList(sharedLikes),
        city: sharedCity || undefined,
        budget: sharedBudget || undefined,
        timeAvailable: sharedTime || undefined,
        avoid: [],
        excluded: [],
      });
    } catch {
      // Shared link parsing is best-effort; the form still works manually.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={dark ? "wrap dark" : "wrap"}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">VA</span>
          <span>
            <span className="brand-name">VibeAtlas</span>
            <br />
            <span className="brand-sub">Your taste is a map</span>
          </span>
        </div>
        <div className="top-meta">
          <strong>USA · Taste Atlas</strong>
          <br />
          Qloo Agentic Hackathon
        </div>
        <button className="btn-ghost" type="button" onClick={() => setDark(!dark)}>
          {dark ? "☀ Light" : "🌙 Dark"}
        </button>
      </header>

      <section className="hero">
        <span className="eyebrow">Taste-to-day planner</span>
        <h1>
          Vibe<span>Atlas</span>
        </h1>
        <p className="tagline">Your taste is a map. Let AI explore it.</p>
        <p className="lede">
          Tell VibeAtlas what you already love — music, films, fashion, food
          — and its agent turns that taste into one coherent day, grounded in
          Qloo&rsquo;s taste graph. Every pick shows its affinity and why it
          matches, so you can see the evidence instead of trusting a guess.
        </p>
        <div className="chips" aria-label="Preset days">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              className="chip"
              type="button"
              onClick={() => {
                setLikes(preset.likes);
                setBudget("Moderate");
                setTimeAvailable("Full day");
                document.getElementById("build-form")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <div className="btnrow">
          <button
            className="btn-primary"
            type="button"
            disabled={loading}
            onClick={() => {
              const current = splitList(likes);
              if (current.length === 0) {
                setLikes(EXAMPLE.likes);
                setCity(EXAMPLE.city);
                setBudget(EXAMPLE.budget);
                setTimeAvailable(EXAMPLE.timeAvailable);
                setAvoid(EXAMPLE.avoid);
                void callPlan({
                  likes: splitList(EXAMPLE.likes),
                  city: EXAMPLE.city,
                  budget: EXAMPLE.budget,
                  timeAvailable: EXAMPLE.timeAvailable,
                  avoid: [],
                  excluded: [],
                });
              } else {
                void callPlan({ ...baseBody(), excluded: [] });
                setExcluded([]);
              }
              setTimeout(() => {
                document.getElementById("build-form")?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
          >
            {loading ? "Agent is planning…" : "Build my day"}
          </button>
          <button
            className="btn-ghost"
            type="button"
            onClick={() => {
              setLikes(EXAMPLE.likes);
              setCity(EXAMPLE.city);
              setBudget(EXAMPLE.budget);
              setTimeAvailable(EXAMPLE.timeAvailable);
              setAvoid(EXAMPLE.avoid);
              document.getElementById("build-form")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Explore the example
          </button>
        </div>
        <div className="spec-grid" aria-label="What VibeAtlas shows">
          <div><p className="spec-label">Route</p><p className="spec-value">5 slots, in order</p></div>
          <div><p className="spec-label">Affinity</p><p className="spec-value">0–1, scored</p></div>
          <div><p className="spec-label">Evidence</p><p className="spec-value">Why this match</p></div>
          <div><p className="spec-label">Control</p><p className="spec-value">Replace any stop</p></div>
        </div>
      </section>

      {plan?.mode === "demo" && (
        <div className="banner demo" role="status">
          <strong>DEMO MODE — DEMO DATA, not live Qloo results.</strong> No
          Qloo API key is configured, so every pick and affinity below is a
          labelled sample for testing the flow. Add{" "}
          <code>QLOO_API_KEY</code> (hackathon host) to switch to live Qloo
          mode. Nothing here should be read as a real Qloo recommendation.
        </div>
      )}
      {plan?.mode === "live" && (
        <div className="banner live" role="status">
          <strong>LIVE Qloo mode.</strong> Picks, affinity scores, tags, and
          contributor links below come from Qloo Insights with explainability
          on.
        </div>
      )}
      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      <section className="card" id="build-form" aria-labelledby="build-heading">
        <p className="section-num">Step 1</p>
        <h2 id="build-heading">What do you love?</h2>
        <p className="hint">
          Short onboarding — skip anything that does not apply. Comma-separated
          likes work best (artists, films, foods, styles, places).
        </p>
        <label htmlFor="likes">Artists, films, food, fashion, places you love</label>
        <div className="chips" aria-label="Quick likes">
          {["Frank Ocean", "Interstellar", "Specialty coffee", "Minimalist fashion", "Quiet places"].map((chip) => {
            const active = splitList(likes).includes(chip);
            return (
              <button
                key={chip}
                className={`chip${active ? " chip-active" : ""}`}
                type="button"
                onClick={() => {
                  const list = splitList(likes);
                  setLikes(active ? list.filter((x) => x !== chip).join(", ") : [...list, chip].join(", "));
                }}
              >
                {active ? "✓ " : "+ "}{chip}
              </button>
            );
          })}
        </div>
        <textarea
          id="likes"
          value={likes}
          onChange={(e) => setLikes(e.target.value)}
          placeholder="e.g. Frank Ocean, Interstellar, minimalist fashion, specialty coffee, quiet places"
        />
        <div className="grid2">
          <div>
            <label htmlFor="city">City you are exploring (USA)</label>
            <select
              id="city"
              value={["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "San Francisco", "Seattle", "Miami", "Boston", "Denver", "Atlanta", "Las Vegas", "Portland", "Nashville"].includes(city) ? city : "Other"}
              onChange={(e) => setCity(e.target.value === "Other" ? "" : e.target.value)}
            >
              {["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "San Francisco", "Seattle", "Miami", "Boston", "Denver", "Atlanta", "Las Vegas", "Portland", "Nashville"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="Other">Other city…</option>
            </select>
            {!["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "San Francisco", "Seattle", "Miami", "Boston", "Denver", "Atlanta", "Las Vegas", "Portland", "Nashville"].includes(city) ? (
              <input
                id="city-other"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Type any city"
                style={{ marginTop: 8 }}
              />
            ) : null}
          </div>
          <div>
            <label htmlFor="budget">Budget (shown on the plan, not a Qloo filter)</label>
            <select
              id="budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            >
              <option value="">e.g. Moderate</option>
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
              <option value="Luxury">Luxury</option>
            </select>
          </div>
          <div>
            <label htmlFor="time">How much time do you have?</label>
            <select
              id="time"
              value={timeAvailable}
              onChange={(e) => setTimeAvailable(e.target.value)}
            >
              <option value="">e.g. Full day</option>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
              <option value="Half day">Half day</option>
              <option value="Full day">Full day</option>
            </select>
          </div>
          <div>
            <label htmlFor="avoid">What should the agent avoid?</label>
            <input
              id="avoid"
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              placeholder="e.g. loud, crowded"
            />
          </div>
        </div>
        <div className="btnrow">
          <button
            className="btn-primary"
            disabled={loading || splitList(likes).length === 0}
            onClick={build}
          >
            {loading ? "Agent is planning…" : "Build my day"}
          </button>
          <button
            className="btn-ghost"
            type="button"
            onClick={() => {
              setLikes(EXAMPLE.likes);
              setCity(EXAMPLE.city);
              setBudget(EXAMPLE.budget);
              setTimeAvailable(EXAMPLE.timeAvailable);
              setAvoid(EXAMPLE.avoid);
            }}
          >
            Try the example
          </button>
          {plan && (
            <>
              <button className="btn-ghost" type="button" disabled={loading} onClick={surprise}>
                Surprise me
              </button>
              <button className="btn-ghost" type="button" onClick={reset}>
                Start over
              </button>
            </>
          )}
        </div>
        <p className="hint">
          No account, no data stored. Your likes are only used as Qloo signal
          inputs for this plan.
        </p>
      </section>

      <section className="card" aria-labelledby="how-heading">
        <p className="section-num">How it works</p>
        <h2 id="how-heading">How the agent works</h2>
        <ol className="steps">
          <li><div className="st">1. UNDERSTAND</div><div className="sd">Your likes, city, budget and time are parsed. Budget and time are display constraints only, not Qloo filters.</div></li>
          <li><div className="st">2. RESOLVE TASTE</div><div className="sd">Likes are resolved to real Qloo entities via Qloo Search.</div></li>
          <li><div className="st">3. EXPLORE CULTURE</div><div className="sd">Qloo Insights ranks candidates by affinity (0-1) with explainability.</div></li>
          <li><div className="st">4. BUILD PLAN</div><div className="sd">Top picks become a 5-stop day: coffee, afternoon, dining, movie, music.</div></li>
          <li><div className="st">5. VALIDATE</div><div className="sd">Coherence is the mean affinity. Missing slots are shown as missing, never invented.</div></li>
        </ol>
      </section>

      {plan && (
        <>
          <section className="card coherence-card" aria-labelledby="coherence-heading">
            <div className="section-head">
              <div>
                <p className="section-num">Your day</p>
                <h2 id="coherence-heading">Day coherence</h2>
              </div>
            </div>
            <div className="day-summary" aria-label="Day summary">
              <span><strong>City</strong> {city.trim() || "New York"}</span>
              <span><strong>Stops</strong> {plan.picks.length} of 5</span>
              <span><strong>Coherence</strong> {Math.round(plan.coherence * 100)}%</span>
              {budget.trim() ? <span><strong>Budget</strong> {budget.trim()}</span> : null}
              {timeAvailable.trim() ? <span><strong>Time</strong> {timeAvailable.trim()}</span> : null}
              {plan.missingSlots.length > 0 ? <span><strong>Missing</strong> {plan.missingSlots.length}</span> : null}
            </div>
            <div className="btnrow" style={{ marginTop: 16 }}>
              <button
                className="btn-ghost"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(summaryLines().join("\n"));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? "✓ Copied!" : "Copy day summary"}
              </button>
              <button
                className="btn-ghost"
                type="button"
                onClick={async () => {
                  try {
                    const params = new URLSearchParams();
                    params.set("likes", likes);
                    if (city.trim()) params.set("city", city.trim());
                    if (budget.trim()) params.set("budget", budget.trim());
                    if (timeAvailable.trim()) params.set("time", timeAvailable.trim());
                    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                Copy share link
              </button>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  const blob = new Blob([summaryLines().join("\n")], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "vibeatlas-day.txt";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download day plan (.txt)
              </button>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => window.print()}
              >
                Print day plan
              </button>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  const today = new Date();
                  const y = today.getFullYear();
                  const m = String(today.getMonth() + 1).padStart(2, "0");
                  const d = String(today.getDate()).padStart(2, "0");
                  const stamp = `${y}${m}${d}T000000`;
                  const events = ALL_SLOTS.map((slot) => {
                    const pick = plan.picks.find((p) => p.slot === slot);
                    if (!pick) return "";
                    const meta = SLOT_META[slot];
                    const [hh, mm] = meta.time.split(":");
                    const endH = String((parseInt(hh, 10) + 1) % 24).padStart(2, "0");
                    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
                    return [
                      "BEGIN:VEVENT",
                      `UID:${pick.id}@vibeatlas`,
                      `DTSTAMP:${stamp}`,
                      `DTSTART:${y}${m}${d}T${hh}${mm}00`,
                      `DTEND:${y}${m}${d}T${endH}${mm}00`,
                      `SUMMARY:${esc(pick.name)}`,
                      `DESCRIPTION:${esc(`${pick.why} Affinity ${pick.affinity.toFixed(2)} in ${city.trim() || "New York"}.`)}`,
                      "END:VEVENT",
                    ].join("\r\n");
                  }).filter(Boolean).join("\r\n");
                  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VibeAtlas//EN", events, "END:VCALENDAR"].join("\r\n");
                  const blob = new Blob([ics], { type: "text/calendar" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "vibeatlas-day.ics";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download calendar (.ics)
              </button>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  if (!plan) return;
                  const entry = { city: city.trim() || "New York", budget, timeAvailable, plan, savedAt: new Date().toISOString() };
                  const next = [entry, ...savedDays].slice(0, 5);
                  setSavedDays(next);
                  try { window.localStorage.setItem("vibeatlas-saved-days", JSON.stringify(next)); } catch { /* best-effort */ }
                }}
              >
                Save this day
              </button>
            </div>
            <div className="share-row">
              <span className="meta">Did this day feel right? </span>
              <button className="btn-ghost" type="button" onClick={() => setRating("up")} style={rating === "up" ? { borderColor: "var(--accent)" } : undefined}>👍 Yes</button>
              {" "}
              <button className="btn-ghost" type="button" onClick={() => setRating("down")} style={rating === "down" ? { borderColor: "var(--accent)" } : undefined}>👎 Not quite</button>
              {rating ? <span className="hint" style={{ marginLeft: 8 }}>Thanks for rating!</span> : null}
            </div>
            <div className="share-row">
              <span className="meta">Share: </span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`My VibeAtlas day in ${city.trim() || "New York"} — coherence ${Math.round(plan.coherence * 100)}% — your taste, mapped.`)}&url=${encodeURIComponent("https://vibeatlas-mrsarimofficials-projects.vercel.app/")}`}
                target="_blank"
                rel="noreferrer"
              >
                X
              </a>
              {" · "}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://vibeatlas-mrsarimofficials-projects.vercel.app/")}`}
                target="_blank"
                rel="noreferrer"
              >
                Facebook
              </a>
              {" · "}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`My VibeAtlas day in ${city.trim() || "New York"} — coherence ${Math.round(plan.coherence * 100)}% https://vibeatlas-mrsarimofficials-projects.vercel.app/`)}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </div>
            <div className="coherence">
              <div>
                <div className="big">{Math.round(plan.coherence * 100)}%</div>
                <div className="big-label">Mean affinity across the plan</div>
              </div>
              <div className="coherence-text">
                <p className="hint" style={{ margin: 0 }}>
                  Mean Qloo affinity across the plan
                  {plan.mode === "demo" ? " (sample values in demo mode)" : ""}.
                  {plan.surprise ? " Surprise Me used the second-ranked pick per slot." : ""}
                </p>
                <p className="hint">{plan.note}</p>
              </div>
            </div>
            {plan.missingSlots.length > 0 && (
              <p className="hint">
                Missing, not invented:{" "}
                {plan.missingSlots.map((s) => SLOT_META[s].label).join(", ")}.
                Qloo returned no usable result for these slots — try different
                likes or a different city.
              </p>
            )}
          </section>

          <section className="card" aria-labelledby="profile-heading">
            <p className="section-num">Taste profile</p>
            <h2 id="profile-heading">Your taste profile</h2>
            <div className="profile-grid">
              <div className="profile-row">
                <strong>Anchors</strong>
                <span>
                  {plan.tasteProfile.anchors.length
                    ? plan.tasteProfile.anchors.join(" · ")
                    : "—"}
                </span>
              </div>
              <div className="profile-row">
                <strong>Discovered interests (from pick tags)</strong>
                <span>
                  {plan.tasteProfile.tags.length
                    ? plan.tasteProfile.tags.join(" · ")
                    : "—"}
                </span>
              </div>
              {plan.tasteProfile.connections.length > 0 && (
                <div className="profile-row">
                  <strong>Cross-domain connections (Qloo explainability)</strong>
                  <span>{plan.tasteProfile.connections.join(" · ")}</span>
                </div>
              )}
            </div>
            {plan.mode === "demo" && (
              <p className="hint">
                In demo mode the anchors are your typed likes and the tags are
                sample tags — not resolved Qloo entities or Qloo explainability.
              </p>
            )}
            {plan.resolved.length > 0 && plan.mode === "live" && (
              <p className="hint">
                Resolved:{" "}
                {plan.resolved
                  .map((r) => `${r.input} → ${r.name ?? "not found"}`)
                  .join(" · ")}
              </p>
            )}
          </section>

          <section className="card route-card" aria-labelledby="route-heading">
            <p className="section-num">Route first</p>
            <h2 id="route-heading">Route Map</h2>
            <div className="route-map">
              {ALL_SLOTS.map((slot, i) => {
                const pick = plan.picks.find((p) => p.slot === slot);
                const meta = SLOT_META[slot];
                return (
                  <div className="route-node" key={slot}>
                    <div className="route-stop">{String(i + 1).padStart(2, "0")}</div>
                    <div className="route-time">{meta.time}</div>
                    <div className="route-name">
                      {pick ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pick.name} ${city.trim() || "New York"}`)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {pick.name}
                        </a>
                      ) : (
                        "Missing — not invented"
                      )}
                    </div>
                    {pick ? <div className="route-aff">{Math.round(pick.affinity * 100)}%</div> : null}
                  </div>
                );
              })}
            </div>
            <p className="hint">
              Schematic route in slot order — not a geographic map. Qloo returns no coordinates, so no real map or distance is claimed.
            </p>
          </section>

          <section className="timeline" aria-label="Day plan taste board">
            <div className="board-head">
              <p className="section-num">Your day, as a board</p>
              <h2>Your Taste Board</h2>
              <p className="hint" style={{ margin: "6px 0 0" }}>
                Five stops, pinned like a board — each card keeps its time, affinity, tags and why-it-matches evidence.
              </p>
            </div>
            {ALL_SLOTS.map((slot, i) => {
              const pick = plan.picks.find((p) => p.slot === slot);
              const meta = SLOT_META[slot];
              const stop = String(i + 1).padStart(2, "0");
              if (!pick) {
                return (
                  <article className={`card pick pick-${slot}`} key={slot} style={{ marginTop: 0 }}>
                    <span className="stop-num" aria-hidden="true">{stop}</span>
                    <div className="time" aria-hidden="true">{meta.icon}</div>
                    <div className="pick-body">
                      <div className="meta">
                        <strong>{meta.time}</strong> · {meta.label}
                      </div>
                      <p className="hint" style={{ margin: "6px 0 0" }}>
                        No Qloo pick for this slot — shown as missing rather
                        than invented.
                      </p>
                    </div>
                  </article>
                );
              }
              return (
                <article className={`card pick pick-${slot}`} key={pick.id} style={{ marginTop: 0 }}>
                  <span className="stop-num" aria-hidden="true">{stop}</span>
                  <div className="time" aria-hidden="true">{meta.icon}</div>
                  <div className="pick-body">
                    <div className="pick-head">
                      <div className="meta">
                        <strong>{meta.time}</strong> · {meta.label} · {pick.evidence}
                      </div>
                      <span className="affinity-value">
                        {pick.affinity.toFixed(2)} / 1.00
                        {plan.mode === "demo" ? " (sample)" : ""}
                      </span>
                    </div>
                    <h3>{pick.name}</h3>
                    <div className="affinity-row">
                      <div className="bar" aria-hidden="true">
                        <div style={{ width: `${Math.round(pick.affinity * 100)}%` }} />
                      </div>
                      <span className="meta">
                        Qloo affinity {Math.round(pick.affinity * 100)}%
                      </span>
                    </div>
                    {pick.tags.length > 0 && (
                      <div className="tags">
                        {pick.tags.map((tag) => (
                          <span className="tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="why">
                      <strong>Why this match?</strong> {pick.why}
                    </p>
                    <button
                      className="btn-veto"
                      type="button"
                      onClick={() => setExpandedId(expandedId === pick.id ? null : pick.id)}
                    >
                      {expandedId === pick.id ? "Hide details ▲" : "Show details ▼"}
                    </button>
                    {expandedId === pick.id && (
                      <div className="pick-details">
                        <p className="meta">Qloo evidence: {pick.evidence}</p>
                        {pick.contributors.length > 0 && (
                          <p className="meta">
                            Qloo explainability contributors:{" "}
                            {pick.contributors.map((c) => `${c.name} (${c.score})`).join(", ")}
                          </p>
                        )}
                        {pick.tags.length > 0 && (
                          <p className="meta">All tags: {pick.tags.join(", ")}</p>
                        )}
                      </div>
                    )}
                    <button
                      className="btn-veto"
                      type="button"
                      disabled={loading}
                      onClick={() => veto(slot, pick.id)}
                    >
                      ✕ Replace this pick only
                    </button>
                    <div style={{ marginTop: 10 }}>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pick.name} ${city.trim() || "New York"}`)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on Google Maps ↗
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="card" aria-labelledby="steps-heading">
            <p className="section-num">Transparency</p>
            <h2 id="steps-heading">Agent steps — what actually happened</h2>
            <ol className="steps">
              {plan.steps.map((step) => (
                <li key={step.title}>
                  <div className="st">{step.title}</div>
                  <span
                    className={`step-pill ${step.status === "skipped" ? "skipped" : step.status === "active" ? "active" : ""}`}
                  >
                    {step.status === "done"
                      ? "✓ done"
                      : step.status === "skipped"
                        ? "— skipped"
                        : "• active"}
                  </span>
                  <div className="sd">{step.detail}</div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      {savedDays.length > 0 && (
        <section className="card" aria-labelledby="saved-heading">
          <p className="section-num">Saved</p>
          <h2 id="saved-heading">My saved days</h2>
          <p className="hint">Saved in this browser only — no account, no server.</p>
          <div className="chips" style={{ marginTop: 12 }}>
            {savedDays.map((saved, idx) => (
              <button
                key={`${saved.savedAt}-${idx}`}
                className="chip"
                type="button"
                onClick={() => {
                  setPlan(saved.plan);
                  setCity(saved.city);
                  setBudget(saved.budget);
                  setTimeAvailable(saved.timeAvailable);
                  document.getElementById("build-form")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {saved.city} · {Math.round(saved.plan.coherence * 100)}% · {new Date(saved.savedAt).toLocaleDateString()}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card" aria-labelledby="why-heading">
        <p className="section-num">Why this works</p>
        <h2 id="why-heading">Why Qloo, not just an LLM?</h2>
        <p className="why">
          An LLM alone can write a plausible day plan — but it is guessing from
          training text. VibeAtlas first resolves your likes to real Qloo
          entities, then asks Qloo Insights to rank candidates by{" "}
          <strong>affinity (0–1)</strong> against your combined taste signal,
          with <strong>explainability</strong> showing which anchors
          contributed. Remove Qloo and the affinity ranking, the contributor
          evidence, and the coherence score all disappear — the plan would be
          a guess again. Explanations here are deterministic summaries of the
          returned Qloo data (or labelled samples in demo mode); no LLM key is
          required, and no model output is treated as evidence.
        </p>
        <p className="hint">
          Honest limits: Qloo place coverage varies by city. A specific venue
          is only shown when Qloo returns one; otherwise the slot is missing
          or labelled as a category/brand-level match, with no claim that a
          place is open, nearby, or affordable. Budget and time are shown as
          your constraints — Qloo was not asked to filter on them, because no
          documented budget/time parameter for these entity types was used.
        </p>
      </section>

      <section className="card maker-note" aria-labelledby="maker-heading">
        <p className="section-num">A note from the maker</p>
        <h2 id="maker-heading">Why I built this</h2>
        <p className="why">
          I built VibeAtlas because taste is personal — no two days should look the same.
          I wanted a planner that does not guess from a generic list, but starts from what
          you already love and shows you why each stop fits. If a pick does not feel right,
          replace just that one stop. The rest of your day stays yours.
        </p>
        <p className="hint">— Muhammad Sarim · USA · Built new for the Qloo Agentic Hackathon</p>
      </section>

      <footer>
        VibeAtlas — built new for the Qloo Agentic Hackathon. MIT licensed.
        <br />
        Qloo is a third-party API; this app stores no personal data and sends
        likes only as Qloo signal inputs.
      </footer>
    </main>
  );
}
