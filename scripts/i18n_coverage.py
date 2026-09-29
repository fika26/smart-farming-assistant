#!/usr/bin/env python3
"""Translation coverage for both catalogs.

    python scripts/i18n_coverage.py            # report
    python scripts/i18n_coverage.py --strict   # exit 1 on missing keys / placeholder drift (CI)

Frontend: frontend/src/locales/<lang>.json   (UI copy)
Backend:  backend/app/i18n/<lang>.py          (alerts, advice, analytics text)

English is the source of truth. For every other language it reports missing
keys, extra keys, and templates whose {placeholders} differ from English —
the last one is the bug that silently drops a number from an alert.
To add a language (e.g. Tamil): copy en.json → ta.json and en.py → ta.py,
translate, register it in frontend/src/lib/i18n.ts and backend/app/i18n/__init__.py,
then run this until it reports 100%.
"""
from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANGS = ["hi", "te", "ta", "kn", "mr", "bn"]
PH = re.compile(r"\{(\w+)\}")


def load_py(path: Path) -> dict[str, str] | None:
    if not path.exists():
        return None
    spec = importlib.util.spec_from_file_location(path.stem, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod.MESSAGES


def load_json(path: Path) -> dict[str, str] | None:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def check(name: str, en: dict[str, str], other: dict[str, str] | None, lang: str) -> int:
    if other is None:
        print(f"  {name:<9} {lang}: not started (0/{len(en)}) — falls back to English")
        return len(en)
    missing = sorted(set(en) - set(other))
    extra = sorted(set(other) - set(en))
    drift = [k for k in en if k in other and set(PH.findall(en[k])) != set(PH.findall(other[k]))]
    pct = 100 * (len(en) - len(missing)) / len(en)
    print(f"  {name:<9} {lang}: {pct:5.1f}%  missing={len(missing)} extra={len(extra)} placeholder-drift={len(drift)}")
    for k in missing[:10]:
        print(f"      missing  {k}")
    for k in drift:
        print(f"      drift    {k}: {sorted(PH.findall(en[k]))} vs {sorted(PH.findall(other[k]))}")
    return len(missing) + len(drift)


def main() -> int:
    strict = "--strict" in sys.argv
    fe = ROOT / "frontend/src/locales"
    be = ROOT / "backend/app/i18n"
    fe_en, be_en = load_json(fe / "en.json"), load_py(be / "en.py")
    problems = 0
    shipped = {"hi", "te"}  # languages that must be complete (CI gate)
    for lang in LANGS:
        print(f"{lang}:")
        p = check("frontend", fe_en, load_json(fe / f"{lang}.json"), lang)
        p += check("backend", be_en, load_py(be / f"{lang}.py"), lang)
        if lang in shipped:
            problems += p
    if strict and problems:
        print(f"\nFAIL: {problems} problem(s) in shipped languages {sorted(shipped)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
