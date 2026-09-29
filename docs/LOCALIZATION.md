# Localization

Every sentence a farmer reads is rendered in their language. There are two
places text comes from:

| Text | Where it lives | Rendered by |
|---|---|---|
| UI copy (labels, buttons, headings) | `frontend/src/locales/<lang>.json` | `t()` / `tp()` from `useApp()` |
| Generated text (alerts, actions, insights, weather/soil advice, risk reasons, analytics highlights) | `backend/app/i18n/<lang>.py` | `t()` / `term()` inside the rule engine |
| Free-form AI answers (chat, advisory brief) | the LLM, told which language to reply in | `app/intelligence/llm.py`, `brief.py` |

## How a request picks its language

1. The language selector writes to `lib/language.ts` (and `localStorage`).
2. `lib/api.ts` adds `?lang=<code>` and `X-Lang` to every request.
3. `useApi` includes the language in its dependency key, so changing it refetches every visible screen.
4. `LanguageMiddleware` (backend) sets a request-scoped ContextVar from `?lang` → `X-Lang` → `Accept-Language` → `en`.
5. Rules call `t("alert.moisture_critical.what", field=…, moisture=…)`; domain words (crop, stage, soil type, trend) go through `term()`.
6. The response `meta.language` and the `Content-Language` header confirm what was rendered.

Each `Alert` also carries `message_key` + `params`, so an SMS/WhatsApp/IVR sender can
re-render the same alert in the recipient's language without re-running the rules.

## Why templates, not machine translation at runtime

The rule engine's output is a small, fixed set of sentences with numbers slotted in.
Translating those once, having a native agronomist review them, and filling the
numbers at runtime is cheaper, instant, works offline, and cannot mistranslate a
dose or a number. An LLM is used only where the text is genuinely open-ended (the
assistant) or as an optional plain-language rewrite (`/api/advisory/brief`) that
must pass a number check before it is shown.

## Adding a language (Tamil example)

1. `cp frontend/src/locales/en.json frontend/src/locales/ta.json` and translate the values.
2. `cp backend/app/i18n/en.py backend/app/i18n/ta.py`; translate `MESSAGES` and add a `TERMS` glossary (crops, stages, soils, trends).
3. Register it: import in `frontend/src/lib/i18n.ts` (`TRANSLATIONS`) and `backend/app/i18n/__init__.py` (`CATALOGS`, `GLOSSARIES`).
4. Add `@fontsource/noto-sans-tamil` in `app/layout.tsx` and `'Noto Sans Tamil'` to `--font-indic`.
5. `python scripts/i18n_coverage.py` until it shows 100% with no placeholder drift; add the code to `shipped` in that script so CI keeps it complete.

Machine drafts are fine as a starting point, but have a native speaker with farming
background review them — the current Hindi and Telugu catalogs are **machine-assisted
drafts** and need that review before a production release.

## Checks

- `python scripts/i18n_coverage.py --strict` — missing keys and `{placeholder}` drift (CI gate for shipped languages).
- `pytest backend/tests` — asserts the Hindi and Telugu dashboards contain no English words outside field names and units.

## Not yet localized

The server-generated content above and the Dashboard, Analytics, navigation, top bar,
error states and meaning helpers are fully localized. Still English:

- UI chrome on the other pages (Alerts, Fields, Sensors, Weather, Crop Health, Map, Risk, Reports, Notifications, Settings, Disease Detection, sign-in pages). Move their literals into `locales/*.json` page by page.
- Backend: crop-health indicator labels/notes and "recent changes", sensor hardware/placement labels, device notifications, the report catalogue, disease-detection results, metric captions, and the rule-based assistant fallback replies.
