"use client";

import { useState } from "react";
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

  return (
    <main className="wrap">
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
          <strong>New York · Taste Atlas</strong>
          <br />
          Qloo Agentic Hackathon
        </div>
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
        <div className="atlas-meta" aria-label="What VibeAtlas shows">
          <span><strong>5-slot route</strong> — one day, in order</span>
          <span><strong>Affinity 0–1</strong> — scored, not guessed</span>
          <span><strong>Why this match</strong> — evidence per stop</span>
          <span><strong>Replace any stop</strong> — one pick at a time</span>
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

      <section className="card" aria-labelledby="build-heading">
        <p className="section-num">Step 1</p>
        <h2 id="build-heading">What do you love?</h2>
        <p className="hint">
          Short onboarding — skip anything that does not apply. Comma-separated
          likes work best (artists, films, foods, styles, places).
        </p>
        <label htmlFor="likes">Artists, films, food, fashion, places you love</label>
        <textarea
          id="likes"
          value={likes}
          onChange={(e) => setLikes(e.target.value)}
          placeholder="e.g. Frank Ocean, Interstellar, minimalist fashion, specialty coffee, quiet places"
        />
        <div className="grid2">
          <div>
            <label htmlFor="city">City you are exploring</label>
            <input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="New York"
            />
          </div>
          <div>
            <label htmlFor="budget">Budget (shown on the plan, not a Qloo filter)</label>
            <input
              id="budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. Moderate"
            />
          </div>
          <div>
            <label htmlFor="time">How much time do you have?</label>
            <input
              id="time"
              value={timeAvailable}
              onChange={(e) => setTimeAvailable(e.target.value)}
              placeholder="e.g. Full day"
            />
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

      {plan && (
        <>
          <section className="card" aria-labelledby="coherence-heading">
            <div className="section-head">
              <div>
                <p className="section-num">Your day</p>
                <h2 id="coherence-heading">Day coherence</h2>
              </div>
            </div>
            <div className="coherence">
              <div>
                <div className="big">{Math.round(plan.coherence * 100)}%</div>
                <div className="big-label">Mean affinity across the plan</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
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

          <section className="timeline" aria-label="Day plan timeline">
            {ALL_SLOTS.map((slot, i) => {
              const pick = plan.picks.find((p) => p.slot === slot);
              const meta = SLOT_META[slot];
              const stop = String(i + 1).padStart(2, "0");
              if (!pick) {
                return (
                  <article className="card pick" key={slot} style={{ marginTop: 0 }}>
                    <span className="stop-num" aria-hidden="true">{stop}</span>
                    <div className="time" aria-hidden="true">{meta.icon}</div>
                    <div className="pick-body">
                      <div className="meta">
                        {meta.time} · {meta.label}
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
                <article className="card pick" key={pick.id} style={{ marginTop: 0 }}>
                  <span className="stop-num" aria-hidden="true">{stop}</span>
                  <div className="time" aria-hidden="true">{meta.icon}</div>
                  <div className="pick-body">
                    <div className="pick-head">
                      <div className="meta">
                        {meta.time} · {meta.label} · {pick.evidence}
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
                    {pick.contributors.length > 0 && (
                      <p className="meta">
                        Qloo explainability contributors:{" "}
                        {pick.contributors
                          .map((c) => `${c.name} (${c.score})`)
                          .join(", ")}
                      </p>
                    )}
                    <button
                      className="btn-veto"
                      type="button"
                      disabled={loading}
                      onClick={() => veto(slot, pick.id)}
                    >
                      ✕ Replace this pick only
                    </button>
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

      <footer>
        VibeAtlas — built new for the Qloo Agentic Hackathon. MIT licensed.
        <br />
        Qloo is a third-party API; this app stores no personal data and sends
        likes only as Qloo signal inputs.
      </footer>
    </main>
  );
}
