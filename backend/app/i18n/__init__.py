"""Server-side localisation for every sentence the backend composes.

Why here and not in the browser: alerts, action plans, insights and analytics
highlights are *generated* by the rule engine with live numbers in them. The
frontend only ever saw the finished English sentence, so switching the UI to
Hindi could never translate them. Each sentence is now a keyed template with
named parameters; the rule engine picks the key, this module renders it in the
request's language.

* Language is request-scoped (a ContextVar set by `LanguageMiddleware` from
  `?lang=`, `X-Lang` or `Accept-Language`), so the rule engine does not need a
  `lang` argument threaded through every function.
* A key missing in a language falls back to English key-by-key, never to the
  raw key, so a partly translated language degrades gracefully.
* Domain vocabulary (crop, growth stage, soil type, trend…) goes through
  `term()`, so "Tomato at the flowering stage" becomes "टमाटर फूल आने की अवस्था"
  rather than "Tomato flowering" inside a Hindi sentence.
* `scripts/i18n_coverage.py` reports every key a language is still missing.
"""
from __future__ import annotations

from contextvars import ContextVar
from string import Formatter

from app.i18n import en, hi, te

SUPPORTED = ("en", "hi", "te", "ta", "kn", "mr", "bn")
DEFAULT = "en"

CATALOGS: dict[str, dict[str, str]] = {"en": en.MESSAGES, "hi": hi.MESSAGES, "te": te.MESSAGES}
GLOSSARIES: dict[str, dict[str, str]] = {"en": {}, "hi": hi.TERMS, "te": te.TERMS}

_language: ContextVar[str] = ContextVar("language", default=DEFAULT)


def normalise(code: str | None) -> str:
    if not code:
        return DEFAULT
    base = code.strip().lower().replace("_", "-").split("-")[0]
    return base if base in SUPPORTED else DEFAULT


def set_language(code: str | None):
    return _language.set(normalise(code))


def reset_language(token) -> None:
    _language.reset(token)


def current_language() -> str:
    return _language.get()


def term(value: str | None, lower: bool = False) -> str:
    """Translate one piece of domain vocabulary. English keeps its casing rules
    (`lower=True` for mid-sentence use); scripts without case ignore it."""
    if value is None:
        return ""
    lang = current_language()
    translated = GLOSSARIES.get(lang, {}).get(value)
    if translated:
        return translated
    return value.lower() if lower else value


def t(key: str, **params) -> str:
    lang = current_language()
    template = CATALOGS.get(lang, {}).get(key) or en.MESSAGES.get(key)
    if template is None:
        return key
    try:
        return template.format(**params)
    except (KeyError, IndexError, ValueError):
        # A translator dropped or renamed a placeholder: fall back to English
        # rather than show a broken sentence.
        return en.MESSAGES.get(key, key).format(**params)


def group_in(n: int) -> str:
    """Indian digit grouping (8,19,000) — what every farmer's bill and bank
    passbook uses, rather than 819,000."""
    sign, digits = ("-", str(-n)) if n < 0 else ("", str(n))
    if len(digits) <= 3:
        return sign + digits
    head, tail = digits[:-3], digits[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return sign + ",".join(groups + [tail])


def placeholders(template: str) -> set[str]:
    return {name for _, name, _, _ in Formatter().parse(template) if name}
