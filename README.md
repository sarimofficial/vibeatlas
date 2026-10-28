# VibeAtlas — Your taste is a map

> "Your taste is a map. Let AI explore it." — Discover the world through what you already love.

VibeAtlas turns someone's favourite music, films, fashion, food, and cultural
interests into a personalised real-world day plan. Instead of asking an LLM to
guess what a person might like, it uses Qloo to discover cultural affinities,
then an agent builds a coherent plan across multiple categories — and shows
the evidence (affinity scores, explainability contributors, agent steps) for
every pick.

Built new for the **Qloo Agentic Hackathon** (Devpost). This is a separate
entry from TasteBridge (`~/workspace/qloo-tastebridge/`), which is kept
untouched as a fallback.

## The real user problem

"Plan a day that matches my vibe" is hard because taste is cross-domain: the
coffee you like, the films you rewatch, and the clothes you wear are connected,
but a generic chatbot cannot measure those connections. VibeAtlas measures
them — via Qloo's taste graph — and then plans around them.

## How the agent works

Visible in the app under "Agent steps — what actually happened":

1. **UNDERSTAND** — Parse likes, city, budget, time, and avoid-list. Budget
   and time are displayed constraints only; they are NOT Qloo query
   parameters (no documented budget/time parameter for these entity types
   was used), so the UI says so explicitly.
2. **RESOLVE TASTE** — Each typed like is resolved to a Qloo entity ID via
   the Qloo search endpoint.
3. **EXPLORE CULTURE** — The combined entity IDs are sent as
   `signal.interests.entities` to Qloo Insights, once per slot, with
   `feature.explainability=true`.
4. **BUILD PLAN** — Top non-vetoed, non-avoided pick per slot, ordered as a
   day timeline. Coherence = mean affinity across the plan.
5. **VALIDATE** — Affinities in [0, 1], no vetoed/avoided picks, missing slots
   listed (never invented), place claims only where Qloo returned a place.

Revising works two ways: **Replace this pick only** re-runs Insights for that
one slot with the vetoed ID excluded and keeps the rest; **Surprise Me**
uses the second-ranked Qloo candidate per slot (still a real Qloo result).

## How Qloo is used (live mode)

Server-side only, in `lib/qloo.ts` and `lib/plan.ts`. The browser never sees
the API key, and no LLM key is required — explanations are deterministic
summaries of returned Qloo data (tags, affinity, explainability).

- **Host (important):** Hackathon API keys work ONLY against
  `https://hackathon.api.qloo.com`. They do NOT work against
  `https://api.qloo.com` (production) — the hackathon guide says using the
  production host with a hackathon key always returns 401. Default
  `QLOO_API_BASE_URL` is therefore the hackathon host; if your key was
  issued for a different host, set that host in the env var.
- **Search (entity resolution):** `GET {base}/search?query=<name>`
  (fallback `GET {base}/v2/search?query=<name>` on 404 only).
- **Insights (recommendations):** `GET {base}/v2/insights` (fallback
  `GET {base}/insights` on 404) with:
  - `filter.type` per slot attempt: coffee `urn:entity:place`; afternoon
    `urn:entity:destination` then `urn:entity:place`; dining
    `urn:entity:place` then `urn:entity:brand`; movie `urn:entity:movie`;
    music `urn:entity:artist`
  - `signal.interests.entities` = comma-separated Qloo IDs from all likes
  - `feature.explainability=true`, `take=8`
  - `filter.exclude.entities` = vetoed IDs (re-plan only)
  - `filter.location.query` = city, for place/destination slots only
  - Auth header on every request: `X-Api-Key: <QLOO_API_KEY>`
- **Affinity:** `results[].query.affinity` (0–1). **Contributors:**
  `results[].query.explainability` (≥ 0.1, top 4, mapped back to anchor names).
- **Honesty rules:** If a key is present but Qloo errors, the API route
  returns a 502 — it never silently falls back to demo data. If a slot
  returns no pick, it is shown as missing. A brand-level dining pick is
  labelled as category-level, with no claim that a venue is open, nearby,
  or affordable.

## Demo mode (no key)

If `QLOO_API_KEY` is empty, `/api/plan` returns `mode: "demo"` with clearly
labelled sample picks from `lib/demo.ts` (invented affinity numbers). The UI
shows a prominent **DEMO MODE — DEMO DATA, not live Qloo results** banner,
and every sample pick is suffixed "(demo)". Demo mode exists so the full
flow — inputs → plan → replace → Surprise Me — can be tested and reviewed
without a key. Demo data must never be presented as a live Qloo result.

## Setup

```bash
npm install
npm run dev        # http://localhost:3000
```

## Environment variables

Copy `.env.example` to `.env.local` (local) or set the same variables in
your host (deploy). Never commit a real key.

| Variable | Meaning |
| --- | --- |
| `QLOO_API_BASE_URL` | Default `https://hackathon.api.qloo.com` (see host note above) |
| `QLOO_API_KEY` | Your own Qloo hackathon API key. Empty = demo mode. |

**Getting a key:** Submit the Qloo API key request form linked from the
Qloo Agentic Hackathon Developer Guide
(`docs.qloo.com/reference/qloo-llm-hackathon-developer-guide`). The guide
says keys are provisioned manually and typically take a few business days —
submit as early as possible, and check spam/junk folders. Keys remain active
through the judging period and are deactivated after the hackathon closes.

## Testing (done in demo mode)

Example input from the plan: Frank Ocean, Interstellar, minimalist fashion,
specialty coffee, quiet places, city Karachi → plan → replace one pick →
re-plan → empty-input validation. No real credentials are required to run
the app or its build; live Qloo behaviour can only be confirmed with a real
key (see Limitations).

## Deployment

```bash
npm run build
npm start
```

Or deploy to Vercel (or any Node host) with `QLOO_API_BASE_URL` and
`QLOO_API_KEY` set as server-side environment variables in the host.
Do not claim deployment until hosting access is confirmed and the deploy
succeeds.

## Known limitations

- Live Qloo behaviour (exact search/insights response shapes, place
  coverage for Karachi) is implemented from the current Qloo docs but has
  NOT been verified with a real key yet — that test is the first thing to
  do once a key arrives. If the first live call 401s, check the host first
  (hackathon vs production); if it 404s, check the fallback paths.
- Qloo place coverage varies by city; Karachi place/destination slots may
  come back empty and will be shown as missing rather than invented.
- Budget and time are not Qloo filters (see above) — they are shown as
  user constraints on the plan.
- No LLM is used: explanations are deterministic Qloo-data summaries.
  This is deliberate (no extra key, no hallucinated evidence), but it
  means explanations are shorter than an LLM-written narrative would be.

## Hackathon submission checklist

- [ ] Real `QLOO_API_KEY` obtained and live test passed
- [ ] Public GitHub repo pushed (README + MIT LICENSE included, no `.env`)
- [ ] Deployed live demo URL (host env vars set)
- [ ] Devpost submission: live demo link + repo link + English description
- [ ] Deadline: 31 Oct 2026, 08:45 PKT (30 Oct 2026, 23:45 EDT)
