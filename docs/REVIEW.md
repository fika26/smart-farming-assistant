# Smart Farming Assistant: technical and UX review

This review covers the two screenshots (Hindi dashboard, English analytics) and the
v5 source they came from. Each finding says what was wrong, why, and what changed in
this revision. Items marked **Open** were not changed.

---

## 1. Localization

### Why Hindi only translated the chrome

`lib/i18n.ts` only held static labels. Everything on the dashboard's main surface
(the headline "Irrigate North Block now", "Root-zone moisture…", "IRRIGATION · ACT NOW",
the reasoning, the action plan) was built as **English f-strings in the backend rule
engine** (`rules.py`, `advisory.py`, `farm_service.py`, `forecast.py`). The API never
knew which language the UI was in, so it could only ever return English. A few labels
on the page ("Recommended", "Why?", "Your fields", status words) were also hard-coded
in the TSX.

### What was implemented

A catalog-driven setup covering both layers:

- **Backend templates.** Each generated sentence is now a keyed template with named
  parameters (`backend/app/i18n/{en,hi,te}.py`, about 210 keys). The rule engine calls
  `t(key, **params)`, and domain words go through a glossary (`term("Tomato")` →
  टमाटर / టమాటా). The numbers still come from live readings; only the words change.
- **Request-scoped language.** `LanguageMiddleware` reads `?lang` → `X-Lang` →
  `Accept-Language`. The engine needs no language argument. Responses report
  `meta.language` and `Content-Language`.
- **Frontend.** UI copy moved to `src/locales/*.json`, with `t(key, params)`
  interpolation and a `tp()` plural helper. `api.ts` sends the language on every call,
  and `useApi` refetches when it changes, so switching language updates the text
  already on screen.
- **Other channels.** Alerts carry `message_key` + `params`, so SMS, WhatsApp or IVR
  can re-render the same alert in each recipient's language.
- **Fonts and typography.** Self-hosted Noto Sans Devanagari/Telugu with
  `unicode-range`, so a script's font is only downloaded when that script is on
  screen. The Latin "eyebrow" style (uppercase plus 0.12em letter-spacing) split
  Indic conjuncts apart and is now turned off for non-English. 11px text is raised to
  12px for Indic scripts.

### Why not LLM translation at runtime?

The rule engine emits a small, fixed set of sentences. Translating them once, having a
native speaker review them, and filling in numbers at runtime is:

- instant
- free
- deterministic
- works offline, which suits edge deployment
- unable to mistranslate a number

A per-request LLM translation fails on all five. Use the LLM only for open-ended text
(the assistant) and for an optional plain-language rewrite (see §2).

### Scaling to Tamil, Kannada, Marathi, Bengali

Follow `docs/LOCALIZATION.md`: copy `en.json` and `en.py`, translate, register the
language, add its Noto font, then run `scripts/i18n_coverage.py`. That script reports
missing keys and `{placeholder}` drift, which is the bug that silently drops a number
from an alert. With `--strict` it acts as a CI gate for shipped languages. Machine
drafts are a fine start. The Hindi and Telugu catalogs here are machine-assisted and
**need review by a native speaker with agronomy background** before production.

**Open:** UI chrome on the other 15 pages, plus a few backend strings (crop-health
indicator notes, sensor hardware labels, reports, disease results, the rule-based chat
fallback), are still English. They are listed in `docs/LOCALIZATION.md`.

---

## 2. Backend and data

### Is the advice coming from a live LLM?

**No.** Every advisory card, alert, action, insight and risk item is produced by the
deterministic rule engine (`rules.py`, `advisory.py`, `forecast.py`), which applies
thresholds and agronomic formulas to the sensor context. That is a sound design for
advice: it is explainable, testable and cannot hallucinate. The LLM is only called
from `/api/ai-assistant/chat`, and only when `AI_API_KEY` is set. Otherwise the chat
falls back to keyword rules and reports `is_mock: true`.

### How to verify it, and a pipeline that stays grounded

Added `GET /api/advisory/brief` (`backend/app/intelligence/brief.py`):

```
readings → FieldContext → rule engine (decides WHAT to do)
                              ├─ rules text (catalog, always available)
                              └─ LLM rewrite in the farmer's language (only if AI_API_KEY)
                                   └─ number guard: every number in the reply must appear
                                      in the facts it was given → pass: engine="llm"
                                                                  fail: engine="rules"
```

- **The rules decide; the LLM only rephrases.** The prompt carries the live facts and
  the rule output, and tells the model not to add advice.
- **Number guard.** `grounded()` rejects any reply containing a figure that is not in
  the facts. This is the production check that the model is reading telemetry rather
  than inventing it. Rejections are logged.
- **Provenance is visible.** `meta.text_engine` is `"rules"` or `"llm"`. The dashboard
  now shows "Advice from the farm rule engine" or "Advice written by AI from your live
  readings" under the headline.
- **Cost control.** Results are cached for 30 minutes per (field, language, rule
  state), so the model is not called on every 60-second dashboard poll.
- **Tests.** They mock the LLM to confirm a grounded reply is shown and an invented
  number is rejected.

### How the displayed data is wired

`MockSource` (`app/mock/generators.py`) generates 21 days of readings for 3 fields in
the `drought_onset` scenario. Those go into `MemoryRepository`, then `build_context()`,
then the rule engine, then every endpoint. `DATA_SOURCE=mock` sets
`meta.simulated=true`, which is where the "Demo data" chip comes from. The real CSV
(`master_smart_farm_dataset.csv`) is exposed separately at `/api/farm-log` because it
has no field identifier.

### Defects found in the path from mock to real data (fixed)

1. **Critical: mock data labelled as real.** `DATA_SOURCE=http`/`mqtt` still built
   `MockSource()`, while `is_simulated` returned `false`. The UI would have shown
   generated numbers as live telemetry. These modes now use `IngestOnlySource`, which
   starts empty and fills only from `POST /api/ingest/readings`.
2. **Ingested readings were wiped every 15 minutes.** `refresh_if_stale()` re-seeds by
   replacing `_readings`, which threw away everything the ESP32 had posted. Ingested
   rows are now kept separately and merged on every re-seed.
3. **False alarms with no data.** An empty field produced a context full of `0.0`
   values, so the engine raised "0% moisture — irrigate now". It now raises one
   localized "No readings from this field yet" alert instead.

### Standard pattern for going live

1. ESP32 posts batches to `/api/ingest/readings` with `X-Device-Key`. `seq` makes
   retries idempotent. For MQTT, a small bridge subscribes and calls the same
   `repository.append`.
2. Swap `MemoryRepository` for a time-series store: TimescaleDB/Supabase
   `sensor_telemetry`, or Mongo time-series. The repository interface is the seam,
   and `supabase.py` is the stub to fill in.
3. Set `DATA_SOURCE=http`. The demo chip disappears because `simulated=false`.
4. Run a first-class staleness rule. It already exists (`device.data.stale`) and
   drives the "last reading N min ago" signal.

**Open:** add per-device authentication (one key per node rather than a shared
`INGEST_API_KEY`) and move ingest behind a queue before running many nodes.

---

## 3. Usability for farmers

### Is the graph-heavy analytics page realistic for an average farmer?

**No.** The old page opened with kL / kWh / ₹ cards and "% vs baseline", then a
four-line time series with two y-scales in one frame, a separate lux chart, and
"t/kL water productivity". A farmer has to know the right range for every channel,
read overlapping lines at 360px, and work out the action themselves. Farm managers
can use it. Most farmers will not.

### What was implemented: a Simple / Detailed toggle

**Simple is the default** and the choice is remembered.

- **One card per channel.** Each has an icon, a plain name ("Soil water", "Air heat",
  "Sunlight"), the current value, and a status word from the backend's thresholds
  (Healthy / Keep an eye on it / Needs attention / Act now). Colour is never the only
  signal.
- **Each card also shows:** a one-line meaning ("Drier than this crop prefers…"), the
  direction over the window, the good range, and a sparkline tinted by status.
- **Resources in farmers' units:** "72,100 litres" rather than 72.1 kL, "25 units of
  electricity" rather than kWh, ₹3,698 with Indian digit grouping, and a verdict pill
  such as "5% less than usual".
- **Plain-language highlights** and the prototype disclaimer, followed by a hint that
  managers can switch to Detailed.

**Detailed** keeps every original chart, now localized, for farm managers.

Other fixes:

- Depletion above 100% used to read "114% of available water used". It now reads
  "below the refill point — the crop is already short of water".
- Light no longer shows a misleading "going up" trend, since raw lux swings between
  day and night.

### Mobile

The shell was already partly mobile-aware (drawer plus bottom tab bar under `lg`).
Checked at **360×800 with no horizontal scroll** on Dashboard and Analytics, in
English, Hindi and Telugu. Fixed:

- **Demo-data chip hidden below `md`.** A farmer on a phone could not tell the numbers
  were simulated. It is now visible at every width.
- **Field status hidden on phones.** The status column was `hidden sm:flex`, so the
  field list showed moisture without saying whether it was OK. A dot and word now sit
  under each field name.
- **Small tap targets.** The menu button was 32px and "Why?" and the footer links were
  text-height. They are now at least 40–44px, and the primary action button is full
  width on phones.
- **Oversized hero type.** At 2.4rem the Hindi and Telugu headlines wrapped to four
  lines. It is now 2rem on phones, with tighter section padding (py-10 rather than
  py-14).
- **Analytics controls.** The Simple/Detailed and range toggles wrap onto their own
  row, and the refresh icon is hidden on phones because the page polls anyway.

**Recommended next (Open):**

- **Bundle size.** First-load JS is about 220–230 kB per page, mostly Recharts. Lazy
  load the chart components (`next/dynamic`) so the Simple view ships without them. A
  budget Android phone on a 3G connection feels this.
- **Detailed charts on phones.** `MultiTrendChart`'s legend and dual scale are still
  cramped at 360px. On small screens show one channel per chart, with a channel picker.
- **Offline.** Add a service worker to cache the last dashboard response. Field
  connectivity is intermittent, and the data model already has timestamps.
- **Voice.** Add a "listen" button that reads the headline advice aloud, using
  `speechSynthesis` with a `hi-IN` / `te-IN` voice, for users with low literacy.

---

## Other defects found while building

- `npm ci` failed: `package-lock.json` was missing leaflet and react-leaflet. The lock
  file has been regenerated.
- `next build` failed a type check in `FarmMap.tsx` (`fitBounds` argument type).
  Fixed.
- `next@14.2.33` has a published security advisory. Upgrade to the patched 14.2.x.
  **Open.**

## Verification

- `pytest backend/tests`: 13 tests pass. They cover catalog parity, Hindi and Telugu
  dashboards containing no English words outside field names and units, header
  negotiation, the LLM number guard, and ingest-only wiring.
- English output was diffed against the original backend. The only changes are Indian
  digit grouping, one evidence label, and the new below-refill-point wording.
- `python scripts/i18n_coverage.py --strict`: Hindi and Telugu are 100% in both
  catalogs, with no placeholder drift.
- `npm run build`: passes.
- Screenshots were taken with Playwright at 360px and 1280px.
